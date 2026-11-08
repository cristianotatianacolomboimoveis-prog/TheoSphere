import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  ClauseNode,
  ClauseType,
  SyntaxDiagramResponse,
  SyntaxWordItem,
} from '../src/linguistics/syntax-diagram.dto';
import { BOOK_ID_TO_NAME_PT } from '../src/common/book-map';

/**
 * Importador determinístico do MACULA Greek Lowfat Syntax Treebank (T1.5 + T1.1 Morfologia).
 *
 * Fonte: Clear-Bible/macula-greek (CC BY 4.0)
 * Commit verificado: 8423afe47b9e8f24b7772e808af45c7159a6fe7e
 * Sem LLM e sem heurística: lê diretamente a árvore <wg>/<w> do XML Lowfat,
 * preservando IDs MACULA (nBBCCCVVVPPP), papéis funcionais (S, P, O, IO, O2, ADV, V, VC, AUX, CONJ),
 * estrutura de cláusulas, lema, morfologia e Strong.
 */

const USFM_TO_BOOK_ID: Record<string, number> = {
  MAT: 40,
  MRK: 41,
  LUK: 42,
  JHN: 43,
  ACT: 44,
  ROM: 45,
  '1CO': 46,
  '2CO': 47,
  GAL: 48,
  EPH: 49,
  PHP: 50,
  COL: 51,
  '1TH': 52,
  '2TH': 53,
  '1TI': 54,
  '2TI': 55,
  TIT: 56,
  PHM: 57,
  HEB: 58,
  JAS: 59,
  '1PE': 60,
  '2PE': 61,
  '1JN': 62,
  '2JN': 63,
  '3JN': 64,
  JUD: 65,
  REV: 66,
};

const BOOK_ID_TO_AUTHOR_PT: Record<number, string> = {
  40: 'Mateus (Evangelista)',
  41: 'Marcos (Evangelista)',
  42: 'Lucas (Evangelista)',
  43: 'Apóstolo João',
  44: 'Lucas (Historiador)',
  45: 'Apóstolo Paulo',
  46: 'Apóstolo Paulo',
  47: 'Apóstolo Paulo',
  48: 'Apóstolo Paulo',
  49: 'Apóstolo Paulo',
  50: 'Apóstolo Paulo',
  51: 'Apóstolo Paulo',
  52: 'Apóstolo Paulo',
  53: 'Apóstolo Paulo',
  54: 'Apóstolo Paulo',
  55: 'Apóstolo Paulo',
  56: 'Apóstolo Paulo',
  57: 'Apóstolo Paulo',
  58: 'Epístola aos Hebreus',
  59: 'Tiago',
  60: 'Apóstolo Pedro',
  61: 'Apóstolo Pedro',
  62: 'Apóstolo João',
  63: 'Apóstolo João',
  64: 'Apóstolo João',
  65: 'Judas',
  66: 'Apóstolo João',
};

interface XmlAstNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlAstNode[];
  text: string;
}

interface ParsedWord extends SyntaxWordItem {
  id: string;
  pos: number;
  word: string;
  lemma: string;
  morph: string;
  strongId: string;
  gloss: string;
  maculaRole?: string;
}

interface RawClauseItem {
  kind: 'clause';
  id: string;
  rule: string;
  maculaRole?: string;
  clauseTypeAttr?: string;
  words: ParsedWord[];
  children: RawClauseItem[];
}

interface RawWordItem {
  kind: 'word';
  word: ParsedWord;
}

type RawItem = RawClauseItem | RawWordItem;

const MACULA_ID_REGEX = /^n\d{11}$/;

function parseAttrs(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of attrStr.matchAll(/([a-zA-Z0-9_:]+)="([^"]*)"/g)) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function parseXmlTree(xml: string): XmlAstNode {
  const root: XmlAstNode = { tag: 'root', attrs: {}, children: [], text: '' };
  const stack: XmlAstNode[] = [root];
  const tokenRe = /<\/?(wg|w|milestone|p|sentence)\b([^>]*?)(\/?)>|([^<]+)/g;
  for (const m of xml.matchAll(tokenRe)) {
    const full = m[0];
    if (full.startsWith('</')) {
      if (stack.length > 1) stack.pop();
    } else if (full.startsWith('<')) {
      const tag = m[1];
      const attrs = parseAttrs(m[2] || '');
      const selfClosing = m[3] === '/';
      const node: XmlAstNode = { tag, attrs, children: [], text: '' };
      stack[stack.length - 1].children.push(node);
      if (!selfClosing) stack.push(node);
    } else if (m[4]) {
      const top = stack[stack.length - 1];
      if (top.tag === 'w') top.text += m[4];
    }
  }
  return root;
}

function mapMaculaRoleToOpenText(
  maculaRole?: string,
): 'S' | 'P' | 'C' | 'A' | 'Conj' | undefined {
  switch (maculaRole) {
    case 'S':
      return 'S';
    case 'V':
    case 'VC':
      return 'P';
    case 'P':
    case 'O':
    case 'IO':
    case 'O2':
      return 'C';
    case 'ADV':
    case 'AUX':
      return 'A';
    case 'CONJ':
      return 'Conj';
    default:
      return undefined;
  }
}

function extractSentenceForVerse(
  node: XmlAstNode,
  targetRef: string,
  inheritedPhraseRole: string | null = null,
  parentIsClClGroup = false,
): RawItem | RawItem[] | null {
  if (node.tag === 'w') {
    const refAttr = node.attrs.ref || '';
    const [verseRef, posStr] = refAttr.split('!');
    if (verseRef !== targetRef) return null;

    const xmlId = node.attrs['xml:id'] || '';
    if (!MACULA_ID_REGEX.test(xmlId)) {
      throw new Error(`ID MACULA inválido em ${refAttr}: "${xmlId}"`);
    }

    const isConj =
      node.attrs.class === 'conj' || (node.attrs.morph || '').startsWith('CONJ');
    const rawRole =
      node.attrs.role || inheritedPhraseRole || (isConj ? 'conj' : '');
    const cleanRole = rawRole.startsWith('err_') ? '' : rawRole.toUpperCase();
    const strongNum = parseInt(node.attrs.strong || '0', 10);
    const gloss =
      node.attrs.gloss && node.attrs.gloss !== '-'
        ? node.attrs.gloss
        : node.attrs.english || '';

    return {
      kind: 'word',
      word: {
        id: xmlId,
        pos: parseInt(posStr || '0', 10),
        word: (node.attrs.unicode || node.text || '').trim(),
        lemma: (node.attrs.lemma || '').normalize('NFC'),
        morph: node.attrs.morph || '',
        strongId: strongNum > 0 ? `G${strongNum}` : '',
        gloss: gloss.trim(),
        maculaRole: cleanRole || undefined,
        role: mapMaculaRoleToOpenText(cleanRole || undefined),
      },
    };
  }

  const rule = node.attrs.rule || node.attrs.Rule || '';
  const isClause =
    node.tag === 'wg' &&
    (node.attrs.class === 'cl' ||
      (parentIsClClGroup && node.attrs.type !== 'group'));
  const isClClGroup =
    node.tag === 'wg' && node.attrs.type === 'group' && rule === 'ClCl';
  const nodeRole =
    node.attrs.role && !node.attrs.role.startsWith('err_')
      ? node.attrs.role
      : null;
  const nextPhraseRole = isClause ? null : nodeRole || inheritedPhraseRole;

  const childItems: RawItem[] = [];
  for (const ch of node.children) {
    if (ch.tag === 'p' || ch.tag === 'milestone') continue;
    const res = extractSentenceForVerse(
      ch,
      targetRef,
      nextPhraseRole,
      isClClGroup,
    );
    if (res) {
      if (Array.isArray(res)) childItems.push(...res);
      else childItems.push(res);
    }
  }

  if (childItems.length === 0) return null;

  // Anexa conjunções coordenativas irmãs (<w role="Conj">) à cláusula imediatamente seguinte
  const mergedItems: RawItem[] = [];
  let pendingConjWords: RawWordItem[] = [];
  for (const item of childItems) {
    if (item.kind === 'word' && item.word.role === 'Conj') {
      pendingConjWords.push(item);
    } else if (item.kind === 'clause' && pendingConjWords.length > 0) {
      item.words.unshift(...pendingConjWords.map((p) => p.word));
      item.words.sort((a, b) => a.pos - b.pos);
      item.id = item.words[0].id;
      pendingConjWords = [];
      mergedItems.push(item);
    } else {
      if (pendingConjWords.length > 0) {
        mergedItems.push(...pendingConjWords);
        pendingConjWords = [];
      }
      mergedItems.push(item);
    }
  }
  if (pendingConjWords.length > 0) mergedItems.push(...pendingConjWords);

  if (!isClause) return mergedItems;

  const directWords = mergedItems
    .filter((x): x is RawWordItem => x.kind === 'word')
    .map((x) => x.word);
  const childClauses = mergedItems.filter(
    (x): x is RawClauseItem => x.kind === 'clause',
  );
  const clauseTypeAttr = node.attrs.clauseType || '';

  if (directWords.length === 0) {
    if (childClauses.length === 1) {
      const only = childClauses[0];
      if (nodeRole && !only.maculaRole) only.maculaRole = nodeRole.toUpperCase();
      if (rule && !only.rule) only.rule = rule;
      if (clauseTypeAttr && !only.clauseTypeAttr)
        only.clauseTypeAttr = clauseTypeAttr;
    }
    return childClauses;
  }

  const onlyFuncWords = directWords.every(
    (w) =>
      w.role === 'Conj' ||
      w.morph.startsWith('T-') ||
      w.morph === 'PRT' ||
      w.morph === 'INJ',
  );
  if (onlyFuncWords && childClauses.length >= 1) {
    const first = childClauses[0];
    first.words.unshift(...directWords);
    first.words.sort((a, b) => a.pos - b.pos);
    first.id = first.words[0].id;
    if (nodeRole && !first.maculaRole) first.maculaRole = nodeRole.toUpperCase();
    if (rule && first.rule && !first.rule.includes(rule))
      first.rule = `${rule} / ${first.rule}`;
    else if (rule && !first.rule) first.rule = rule;
    if (clauseTypeAttr && !first.clauseTypeAttr)
      first.clauseTypeAttr = clauseTypeAttr;
    return childClauses;
  }

  const validChildren: RawClauseItem[] = [];
  for (const cc of childClauses) {
    const ccOnlyFunc =
      cc.children.length === 0 &&
      cc.words.every((w) => w.role === 'Conj' || w.morph.startsWith('T-'));
    if (ccOnlyFunc) {
      directWords.push(...cc.words);
    } else {
      validChildren.push(cc);
    }
  }

  directWords.sort((a, b) => a.pos - b.pos);

  return [
    {
      kind: 'clause',
      id: directWords[0].id,
      rule,
      maculaRole: nodeRole ? nodeRole.toUpperCase() : undefined,
      clauseTypeAttr,
      words: directWords,
      children: validChildren,
    },
  ];
}

function classifyClauseFromMacula(
  raw: RawClauseItem,
  level: number,
): {
  clauseType: ClauseType;
  labelPt: string;
  functionalRole: 'S' | 'P' | 'C' | 'A' | 'Conj' | 'Voc';
  syntacticDomain: 'Primary' | 'Secondary' | 'Embedded';
} {
  const conjWord = raw.words.find((w) => w.role === 'Conj');
  const conjLemma = (conjWord?.lemma || '').toLowerCase();
  const verbWord = raw.words.find(
    (w) => w.maculaRole === 'V' || w.maculaRole === 'VC' || w.morph.startsWith('V-'),
  );
  const verbMorph = verbWord?.morph || '';
  const hasRelPron = raw.words.some((w) => w.morph.startsWith('R-'));
  const ruleSuffix = raw.rule ? ` [${raw.rule}]` : '';

  const functionalRole: 'S' | 'P' | 'C' | 'A' | 'Conj' | 'Voc' =
    mapMaculaRoleToOpenText(raw.maculaRole) || (level === 0 ? 'P' : 'A');
  const syntacticDomain: 'Primary' | 'Secondary' | 'Embedded' =
    level === 0 ? 'Primary' : level === 1 ? 'Secondary' : 'Embedded';

  if (level === 0) {
    return {
      clauseType: 'main',
      labelPt: `Cláusula Principal${ruleSuffix}`,
      functionalRole: 'P',
      syntacticDomain: 'Primary',
    };
  }

  if (conjLemma === 'ἵνα' || conjLemma === 'ὅπως') {
    return {
      clauseType: 'subordinate_purpose',
      labelPt: `Subordinada Final / Propósito${ruleSuffix}`,
      functionalRole,
      syntacticDomain,
    };
  }
  if (
    conjLemma === 'ὅτι' ||
    conjLemma === 'διότι' ||
    conjLemma === 'ἐπεί' ||
    conjLemma === 'γάρ'
  ) {
    return {
      clauseType: 'subordinate_causal',
      labelPt:
        raw.maculaRole === 'O'
          ? `Subordinada Completiva (${conjLemma})${ruleSuffix}`
          : `Subordinada Causal (${conjLemma})${ruleSuffix}`,
      functionalRole,
      syntacticDomain,
    };
  }
  if (conjLemma === 'εἰ' || conjLemma === 'ἐάν' || conjLemma === 'ἄν') {
    return {
      clauseType: 'subordinate_conditional',
      labelPt: `Subordinada Condicional${ruleSuffix}`,
      functionalRole,
      syntacticDomain,
    };
  }
  if (conjLemma === 'ὅτε' || conjLemma === 'ὅταν' || conjLemma === 'ἕως') {
    return {
      clauseType: 'subordinate_temporal',
      labelPt: `Subordinada Temporal${ruleSuffix}`,
      functionalRole,
      syntacticDomain,
    };
  }
  if (conjLemma === 'ὥστε') {
    return {
      clauseType: 'subordinate_result',
      labelPt: `Subordinada Consecutiva${ruleSuffix}`,
      functionalRole,
      syntacticDomain,
    };
  }
  if (hasRelPron) {
    return {
      clauseType: 'subordinate_relative',
      labelPt: `Oração Relativa${ruleSuffix}`,
      functionalRole,
      syntacticDomain,
    };
  }
  if (
    raw.clauseTypeAttr === 'nominalized' ||
    (verbMorph.startsWith('V-') && verbMorph.includes('P-'))
  ) {
    return {
      clauseType: 'participial',
      labelPt: `Cláusula Participial${ruleSuffix}`,
      functionalRole,
      syntacticDomain,
    };
  }
  if (verbMorph.startsWith('V-') && verbMorph.endsWith('N')) {
    return {
      clauseType: 'infinitive_phrase',
      labelPt: `Cláusula Infinitiva${ruleSuffix}`,
      functionalRole,
      syntacticDomain,
    };
  }

  return {
    clauseType: raw.maculaRole ? 'subordinate_relative' : 'main',
    labelPt: raw.maculaRole
      ? `Cláusula Subordinada (${raw.maculaRole})${ruleSuffix}`
      : `Cláusula Coordenada${ruleSuffix}`,
    functionalRole,
    syntacticDomain,
  };
}

function buildClauseNode(
  raw: RawClauseItem,
  level: number,
  counter: { count: number; maxDepth: number },
): ClauseNode {
  counter.count++;
  if (level > counter.maxDepth) counter.maxDepth = level;

  const { clauseType, labelPt, functionalRole, syntacticDomain } =
    classifyClauseFromMacula(raw, level);

  const conjWord = raw.words.find((w) => w.role === 'Conj');
  const verbWords = raw.words.filter(
    (w) => w.maculaRole === 'V' || w.maculaRole === 'VC',
  );
  const subjWords = raw.words.filter((w) => w.maculaRole === 'S');

  const words: SyntaxWordItem[] = raw.words.map((w) => ({
    id: w.id,
    word: w.word,
    lemma: w.lemma,
    morph: w.morph,
    gloss: w.gloss || undefined,
    strongId: w.strongId || undefined,
    role: w.role,
    maculaRole: w.maculaRole,
  }));

  const children =
    raw.children.length > 0
      ? raw.children.map((ch) => buildClauseNode(ch, level + 1, counter))
      : undefined;

  return {
    id: raw.id,
    level,
    clauseType,
    labelPt,
    conjunction: conjWord ? conjWord.word : undefined,
    textOriginal: raw.words.map((w) => w.word).join(' '),
    textTranslation: raw.words
      .map((w) => w.gloss)
      .filter(Boolean)
      .join(' '),
    grammaticalSubject:
      subjWords.length > 0
        ? subjWords.map((w) => w.word).join(' ')
        : undefined,
    mainVerb:
      verbWords.length > 0
        ? verbWords.map((w) => `${w.word} (${w.morph})`).join(' ')
        : undefined,
    functionalRole,
    syntacticDomain,
    words,
    children,
  };
}

function parseDirectory(
  dir: string,
  treesMap: Record<string, SyntaxDiagramResponse>,
  interlinearRows: Array<{
    bookId: number;
    chapter: number;
    verse: number;
    position: number;
    word: string;
    lemma: string;
    morph: string;
    strongId: string;
    gloss: string;
  }>,
  collectInterlinear: boolean,
) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d+-.*\.xml$/.test(f))
    .sort();

  for (const f of files) {
    const xml = fs.readFileSync(path.join(dir, f), 'utf8');
    const sentences = [
      ...xml.matchAll(/<sentence>[\s\S]*?<\/sentence>/g),
    ].map((m) => m[0]);

    const verseToSentences = new Map<string, string[]>();
    for (const s of sentences) {
      const refs = new Set(
        [...s.matchAll(/<w\b[^>]*\bref="([^"!]+)!\d+"/g)].map((m) => m[1]),
      );
      for (const r of refs) {
        if (!verseToSentences.has(r)) verseToSentences.set(r, []);
        verseToSentences.get(r)!.push(s);
      }
    }

    for (const [ref, sents] of verseToSentences.entries()) {
      const m = ref.match(/^([A-Z0-9]+) (\d+):(\d+)$/);
      if (!m) continue;
      const [, usfm, chStr, vsStr] = m;
      const chapter = parseInt(chStr, 10);
      const verse = parseInt(vsStr, 10);
      if (verse >= 99) continue; // Ignora marcador artificial MRK 16:99

      const treebankKey = `${usfm}.${chapter}.${verse}`;
      if (treesMap[treebankKey]) continue; // Preserva SBLGNT quando já presente

      const bookId = USFM_TO_BOOK_ID[usfm];
      const rawClauses: RawClauseItem[] = [];

      for (const s of sents) {
        const ast = parseXmlTree(s);
        const res = extractSentenceForVerse(ast, ref);
        if (!res) continue;
        const items = Array.isArray(res) ? res : [res];
        const topClauses = items.filter(
          (x): x is RawClauseItem => x.kind === 'clause',
        );
        const strayWords = items
          .filter((x): x is RawWordItem => x.kind === 'word')
          .map((x) => x.word);

        if (strayWords.length > 0) {
          if (topClauses.length > 0) {
            topClauses[0].words.unshift(...strayWords);
            topClauses[0].words.sort((a, b) => a.pos - b.pos);
            topClauses[0].id = topClauses[0].words[0].id;
          } else {
            strayWords.sort((a, b) => a.pos - b.pos);
            topClauses.push({
              kind: 'clause',
              id: strayWords[0].id,
              rule: 'Fragment',
              words: strayWords,
              children: [],
            });
          }
        }
        rawClauses.push(...topClauses);
      }

      if (rawClauses.length === 0) continue;

      // Coleta todas as palavras do versículo para InterlinearWord
      if (collectInterlinear && bookId) {
        const allVerseWords: ParsedWord[] = [];
        const collectW = (cls: RawClauseItem[]) => {
          for (const c of cls) {
            allVerseWords.push(...c.words);
            collectW(c.children);
          }
        };
        collectW(rawClauses);
        allVerseWords.sort((a, b) => a.pos - b.pos);
        for (let idx = 0; idx < allVerseWords.length; idx++) {
          const w = allVerseWords[idx];
          interlinearRows.push({
            bookId,
            chapter,
            verse,
            position: idx + 1,
            word: w.word,
            lemma: w.lemma,
            morph: w.morph,
            strongId: w.strongId || 'G0',
            gloss: w.gloss || w.lemma,
          });
        }
      }

      const counter = { count: 0, maxDepth: 0 };
      const rootClauses = rawClauses.map((rc) =>
        buildClauseNode(rc, 0, counter),
      );
      const bookNamePt = BOOK_ID_TO_NAME_PT[bookId] || usfm;
      const humanRef = `${bookNamePt} ${chapter}:${verse}`;

      treesMap[treebankKey] = {
        reference: humanRef,
        titlePt: `Árvore Sintática MACULA — ${humanRef}`,
        authorPt: BOOK_ID_TO_AUTHOR_PT[bookId] || 'Novo Testamento Grego',
        totalClauses: counter.count,
        maxNestingDepth: counter.maxDepth,
        rootClauses,
        isCanonicalPreset: false,
        method: 'treebank',
        methodLabelPt: '✓ Árvore Anotada (Treebank)',
        isAnnotatedTree: true,
        source:
          'MACULA Greek Linguistic Datasets / Lowfat Syntax Treebank (Clear Bible, CC BY 4.0, commit 8423afe4)',
      };
    }
  }
}

async function main() {
  const sblgntDir =
    process.env.MACULA_SBLGNT_DIR || '/tmp/macula-greek/SBLGNT/lowfat';
  const n1904Dir =
    process.env.MACULA_N1904_DIR || '/tmp/macula-greek/Nestle1904/lowfat';
  const syncDb = !process.argv.includes('--no-db');

  const treesMap: Record<string, SyntaxDiagramResponse> = {};
  const interlinearRows: Array<{
    bookId: number;
    chapter: number;
    verse: number;
    position: number;
    word: string;
    lemma: string;
    morph: string;
    strongId: string;
    gloss: string;
  }> = [];

  console.log(`📂 Importando SBLGNT Lowfat XML de: ${sblgntDir}`);
  parseDirectory(sblgntDir, treesMap, interlinearRows, true);
  const sblgntCount = Object.keys(treesMap).length;
  console.log(`✅ Versículos SBLGNT importados: ${sblgntCount}`);

  if (fs.existsSync(n1904Dir)) {
    console.log(`📂 Complementando versículos críticos de Nestle1904: ${n1904Dir}`);
    parseDirectory(n1904Dir, treesMap, interlinearRows, false);
  }

  // Aliases de versificação grega → portuguesa/inglesa (At 19:41 em ACT 19:40; 2Co 13:14 em 2CO 13:13)
  if (treesMap['ACT.19.40'] && !treesMap['ACT.19.41']) {
    const act40 = treesMap['ACT.19.40'];
    if (act40.rootClauses.length >= 2) {
      const lastClause = act40.rootClauses[act40.rootClauses.length - 1];
      treesMap['ACT.19.41'] = {
        ...act40,
        reference: 'Atos 19:41',
        titlePt: 'Árvore Sintática MACULA — Atos 19:41 (ACT 19:40b)',
        totalClauses: 1 + (lastClause.children?.length || 0),
        rootClauses: [lastClause],
      };
    }
  }
  if (treesMap['2CO.13.13'] && !treesMap['2CO.13.14']) {
    treesMap['2CO.13.14'] = {
      ...treesMap['2CO.13.13'],
      reference: '2 Coríntios 13:14',
      titlePt: 'Árvore Sintática MACULA — 2 Coríntios 13:14 (2CO 13:13)',
    };
  }

  const totalKeys = Object.keys(treesMap).length;
  console.log(`📊 Total de árvores sintáticas por versículo: ${totalKeys}`);
  console.log(`📊 Total de palavras morfológicas SBLGNT: ${interlinearRows.length}`);

  const dataset = {
    source: 'MACULA Greek Linguistic Datasets / Lowfat Syntax Treebank (Clear Bible)',
    repository: 'https://github.com/Clear-Bible/macula-greek',
    commit: '8423afe47b9e8f24b7772e808af45c7159a6fe7e',
    license: 'CC BY 4.0',
    totalVerses: totalKeys,
    trees: treesMap,
  };

  const outPath = path.join(
    __dirname,
    '../prisma/data/macula-syntax-trees.json.gz',
  );
  const rawJson = Buffer.from(JSON.stringify(dataset), 'utf8');
  const compressed = zlib.gzipSync(rawJson, { level: 9 });
  fs.writeFileSync(outPath, compressed);

  console.log(
    `💾 Dataset gravado em ${outPath}: ${(rawJson.length / 1024 / 1024).toFixed(2)} MB JSON → ${(compressed.length / 1024 / 1024).toFixed(2)} MB .json.gz`,
  );

  if (syncDb) {
    const connectionString =
      process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';
    const pool = new Pool({ connectionString });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    try {
      console.log(
        `\n🔄 Sincronizando morfologia SBLGNT (${interlinearRows.length} palavras) em InterlinearWord...`,
      );
      const BATCH_SIZE = 2000;
      for (let i = 0; i < interlinearRows.length; i += BATCH_SIZE) {
        const batch = interlinearRows.slice(i, i + BATCH_SIZE);
        const payload = JSON.stringify(batch);
        await prisma.$executeRaw`
          INSERT INTO "InterlinearWord" (id, "bookId", chapter, verse, position, word, translit, gloss, "strongId", morph, lemma)
          SELECT
            gen_random_uuid()::text,
            v."bookId",
            v.chapter,
            v.verse,
            v.position,
            v.word,
            v.lemma,
            v.gloss,
            v."strongId",
            v.morph,
            v.lemma
          FROM jsonb_to_recordset(${payload}::jsonb) AS v(
            "bookId" integer,
            chapter integer,
            verse integer,
            position integer,
            word text,
            lemma text,
            morph text,
            "strongId" text,
            gloss text
          )
          ON CONFLICT ("bookId", chapter, verse, position) DO UPDATE SET
            lemma = EXCLUDED.lemma,
            morph = EXCLUDED.morph,
            "strongId" = COALESCE(NULLIF("InterlinearWord"."strongId", ''), EXCLUDED."strongId"),
            gloss = COALESCE(NULLIF("InterlinearWord".gloss, ''), EXCLUDED.gloss);
        `;
        process.stdout.write(
          `\r  Progresso InterlinearWord: ${Math.min(i + BATCH_SIZE, interlinearRows.length)}/${interlinearRows.length}`,
        );
      }
      console.log('\n✅ Sincronização de InterlinearWord concluída.');
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  }
}

main().catch((err) => {
  console.error('❌ Erro na importação MACULA Lowfat:', err);
  process.exit(1);
});
