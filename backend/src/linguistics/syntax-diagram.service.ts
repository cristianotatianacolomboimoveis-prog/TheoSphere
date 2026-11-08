import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { PrismaService } from '../prisma.service';
import {
  CanonicalDiagramSummary,
  ClauseNode,
  ClauseType,
  SyntaxDiagramResponse,
} from './syntax-diagram.dto';
import {
  CANONICAL_DIAGRAMS,
  CANONICAL_DIAGRAMS_LIST,
} from './syntax-canonical-diagrams';
import { CURATED_SYNTAX_VERSES } from './treebanks/curated-syntax.data';
import { BOOK_ID_TO_NAME_PT, resolveBookId } from '../common/book-map';
import { InterlinearWordRow } from './linguistics.service';

const MACULA_ID_REGEX = /^n\d{11}$/;

/**
 * Invariante T1.5: todo diagrama rotulado como `treebank` / `isAnnotatedTree: true`
 * deve ter ID MACULA válido (`nBBCCCVVVPPP`, 12 caracteres) em todas as cláusulas
 * e em todas as palavras. Lança erro se qualquer nó violar o invariante.
 */
export function assertValidMaculaTreebankDiagram(
  diagram: SyntaxDiagramResponse,
): void {
  if (diagram.method !== 'treebank' || !diagram.isAnnotatedTree) {
    throw new Error(
      `Invariante T1.5 violado: diagrama em assertValidMaculaTreebankDiagram deve ter method="treebank" e isAnnotatedTree=true`,
    );
  }
  if (!diagram.rootClauses || diagram.rootClauses.length === 0) {
    throw new Error(
      `Invariante T1.5 violado: diagrama treebank (${diagram.reference}) sem cláusulas raiz`,
    );
  }

  const checkClause = (node: ClauseNode) => {
    if (!node.id || !MACULA_ID_REGEX.test(node.id)) {
      throw new Error(
        `Invariante T1.5 violado: cláusula sem ID MACULA válido (recebido: "${node.id ?? ''}")`,
      );
    }
    if (!node.words || node.words.length === 0) {
      throw new Error(
        `Invariante T1.5 violado: cláusula ${node.id} sem palavras associadas`,
      );
    }
    for (const w of node.words) {
      if (!w.id || !MACULA_ID_REGEX.test(w.id)) {
        throw new Error(
          `Invariante T1.5 violado: palavra "${w.word}" na cláusula ${node.id} sem ID MACULA válido (recebido: "${w.id ?? ''}")`,
        );
      }
    }
    if (node.children) {
      for (const child of node.children) {
        checkClause(child);
      }
    }
  };

  for (const root of diagram.rootClauses) {
    checkClause(root);
  }
}

const USFM_BOOK_CODES: Record<number, string> = {
  1: 'GEN',
  2: 'EXO',
  3: 'LEV',
  4: 'NUM',
  5: 'DEU',
  6: 'JOS',
  7: 'JDG',
  8: 'RUT',
  9: '1SA',
  10: '2SA',
  11: '1KI',
  12: '2KI',
  13: '1CH',
  14: '2CH',
  15: 'EZR',
  16: 'NEH',
  17: 'EST',
  18: 'JOB',
  19: 'PSA',
  20: 'PRO',
  21: 'ECC',
  22: 'SNG',
  23: 'ISA',
  24: 'JER',
  25: 'LAM',
  26: 'EZK',
  27: 'DAN',
  28: 'HOS',
  29: 'JOL',
  30: 'AMO',
  31: 'OBA',
  32: 'JON',
  33: 'MIC',
  34: 'NAM',
  35: 'HAB',
  36: 'ZEP',
  37: 'HAG',
  38: 'ZEC',
  39: 'MAL',
  40: 'MAT',
  41: 'MRK',
  42: 'LUK',
  43: 'JHN',
  44: 'ACT',
  45: 'ROM',
  46: '1CO',
  47: '2CO',
  48: 'GAL',
  49: 'EPH',
  50: 'PHP',
  51: 'COL',
  52: '1TH',
  53: '2TH',
  54: '1TI',
  55: '2TI',
  56: 'TIT',
  57: 'PHM',
  58: 'HEB',
  59: 'JAS',
  60: '1PE',
  61: '2PE',
  62: '1JN',
  63: '2JN',
  64: '3JN',
  65: 'JUD',
  66: 'REV',
};

@Injectable()
export class SyntaxDiagramService {
  private readonly logger = new Logger(SyntaxDiagramService.name);
  private static maculaTreesCache: Record<
    string,
    SyntaxDiagramResponse
  > | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Carrega sob demanda o dataset versionado de árvores sintáticas MACULA Greek Lowfat.
   */
  getMaculaTrees(): Record<string, SyntaxDiagramResponse> {
    if (SyntaxDiagramService.maculaTreesCache) {
      return SyntaxDiagramService.maculaTreesCache;
    }

    const candidates = [
      path.join(__dirname, '../../prisma/data/macula-syntax-trees.json.gz'),
      path.join(__dirname, '../../../prisma/data/macula-syntax-trees.json.gz'),
      path.join(process.cwd(), 'prisma/data/macula-syntax-trees.json.gz'),
      path.join(
        process.cwd(),
        'backend/prisma/data/macula-syntax-trees.json.gz',
      ),
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath);
          const json = zlib.gunzipSync(raw).toString('utf8');
          const parsed = JSON.parse(json) as {
            trees?: Record<string, SyntaxDiagramResponse>;
          };
          SyntaxDiagramService.maculaTreesCache = parsed.trees || {};
          return SyntaxDiagramService.maculaTreesCache;
        } catch (err) {
          this.logger.error(
            `Falha ao carregar dataset MACULA em ${filePath}: ${String(err)}`,
          );
        }
      }
    }

    SyntaxDiagramService.maculaTreesCache = {};
    return SyntaxDiagramService.maculaTreesCache;
  }

  /**
   * Retorna o resumo dos diagramas exegéticos canônicos disponíveis.
   */
  getCanonicalDiagramsList(): CanonicalDiagramSummary[] {
    return CANONICAL_DIAGRAMS_LIST;
  }

  /**
   * Retorna um diagrama canônico pré-compilado pelo ID ou referência.
   */
  getCanonicalDiagram(idOrRef: string): SyntaxDiagramResponse | null {
    const key = idOrRef.toUpperCase().trim();
    if (CANONICAL_DIAGRAMS[key]) {
      return CANONICAL_DIAGRAMS[key];
    }

    // Busca por referência aproximada
    for (const [k, diagram] of Object.entries(CANONICAL_DIAGRAMS)) {
      if (k.includes(key) || diagram.reference.toUpperCase().includes(key)) {
        return diagram;
      }
    }

    return null;
  }

  /**
   * Analisa e decompõe estruturalmente qualquer versículo bíblico em árvore de cláusulas.
   */
  async getVerseDiagram(
    bookInput: string,
    chapter: number,
    verse: number,
  ): Promise<SyntaxDiagramResponse> {
    const numericBookId = Number(bookInput) || resolveBookId(bookInput) || 1;
    const usfmCode = USFM_BOOK_CODES[numericBookId] || bookInput.toUpperCase();
    const treebankKey = `${usfmCode}.${chapter}.${verse}`;

    // 1. Árvore sintática real importada do MACULA Greek Lowfat XML (CC BY 4.0).
    //    Garante o invariante T1.5 (todos os nós possuem ID MACULA válido) e nunca mistura com curadoria manual.
    const maculaTrees = this.getMaculaTrees();
    if (maculaTrees[treebankKey]) {
      const diagram = maculaTrees[treebankKey];
      assertValidMaculaTreebankDiagram(diagram);
      return diagram;
    }

    // 2. Diagramas curados manualmente (mantidos apenas como fallback separado caso fora do treebank)
    if (CURATED_SYNTAX_VERSES[treebankKey]) {
      return CURATED_SYNTAX_VERSES[treebankKey];
    }

    const canonicalKey = `${bookInput.toUpperCase()}.${chapter}.${verse}`;
    // 3. Verifica se há preset canônico predefinido (ex.: GEN.1.1-3 no AT)
    for (const [k, diagram] of Object.entries(CANONICAL_DIAGRAMS)) {
      if (k.startsWith(canonicalKey) || k === canonicalKey) {
        return diagram;
      }
    }

    const bookNamePt = BOOK_ID_TO_NAME_PT[numericBookId] || bookInput;
    const humanRef = `${bookNamePt} ${chapter}:${verse}`;

    // 1. Busca texto em Português (BLIVRE)
    let textPt = '';
    try {
      const verseRow = await this.prisma.bibleVerse.findFirst({
        where: {
          bookId: numericBookId,
          chapter,
          verse,
          translation: 'BLIVRE',
        },
        select: { text: true },
      });
      textPt = verseRow?.text || '';
    } catch (err) {
      this.logger.warn(
        `Erro ao buscar texto BLIVRE para ${humanRef}: ${String(err)}`,
      );
    }

    // 2. Busca palavras interlineares
    let interlinearWords: InterlinearWordRow[] = [];
    try {
      interlinearWords = await this.prisma.$queryRawUnsafe<
        InterlinearWordRow[]
      >(
        `SELECT id, "bookId", chapter, verse, position, word, translit, gloss, "glossEs", "strongId", morph, lemma, "lemmaGloss"
         FROM "InterlinearWord"
         WHERE "bookId" = $1 AND chapter = $2 AND verse = $3
         ORDER BY position ASC`,
        numericBookId,
        chapter,
        verse,
      );
    } catch (err) {
      this.logger.warn(
        `Erro ao buscar palavras interlineares para ${humanRef}: ${String(err)}`,
      );
    }

    // Se temos dados interlineares, realiza a segmentação sintática refinada
    if (interlinearWords && interlinearWords.length > 0) {
      return this.buildInterlinearDiagram(humanRef, textPt, interlinearWords);
    }

    // Fallback: segmentação morfo-sintática heurística no texto em português
    return this.buildHeuristicTextDiagram(humanRef, textPt);
  }

  /**
   * Constrói diagrama sintático analisando as tags morfológicas e conjunções do interlinear grego/hebraico.
   */
  private buildInterlinearDiagram(
    humanRef: string,
    textPt: string,
    words: InterlinearWordRow[],
  ): SyntaxDiagramResponse {
    const clauses: ClauseNode[] = [];
    let currentWords: InterlinearWordRow[] = [];
    let currentClauseType: ClauseType = 'main';
    let currentLabel = 'Cláusula Principal';
    let currentConjunction: string | undefined;
    let clauseIdx = 1;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const morph = (w.morph || '').toUpperCase();
      const rawText = w.word || '';
      const lemma = (w.lemma || '').toLowerCase();

      // Checa se inicia nova cláusula subordinada ou participial
      let isNewClauseStart = false;
      let newType: ClauseType = 'main';
      let newLabel = 'Cláusula Coordenada';
      let conj: string | undefined;

      // Conjunções Subordinativas no Grego
      if (
        morph.startsWith('CONJ') ||
        morph.startsWith('C-') ||
        morph.startsWith('CS') ||
        morph.includes('CONJ')
      ) {
        if (
          lemma === 'ἵνα' ||
          lemma === 'ὅπως' ||
          rawText.includes('ἵνα') ||
          rawText.includes('ὅπως')
        ) {
          isNewClauseStart = true;
          newType = 'subordinate_purpose';
          newLabel = 'Cláusula Subordinada de Propósito (Final)';
          conj = rawText;
        } else if (
          lemma === 'ὅτι' ||
          lemma === 'διότι' ||
          rawText.includes('ὅτι') ||
          rawText.includes('διότι')
        ) {
          isNewClauseStart = true;
          newType = 'subordinate_causal';
          newLabel = 'Cláusula Subordinada Causal';
          conj = rawText;
        } else if (
          lemma === 'εἰ' ||
          lemma === 'ἐάν' ||
          rawText.includes('εἰ') ||
          rawText.includes('ἐάν')
        ) {
          isNewClauseStart = true;
          newType = 'subordinate_conditional';
          newLabel = 'Cláusula Subordinada Condicional (Prótase)';
          conj = rawText;
        } else if (lemma === 'ὥστε' || rawText.includes('ὥστε')) {
          isNewClauseStart = true;
          newType = 'subordinate_result';
          newLabel = 'Cláusula Subordinada Consecutiva (Resultado)';
          conj = rawText;
        } else if (
          lemma === 'καθώς' ||
          lemma === 'ὡς' ||
          rawText.includes('καθώς')
        ) {
          isNewClauseStart = true;
          newType = 'subordinate_causal';
          newLabel = 'Cláusula Comparativa / Fundamentação';
          conj = rawText;
        }
      }

      // Pronomes relativos: ὅς, ἥ, ὅ
      if (morph.startsWith('R-') || morph.startsWith('PRO-REL')) {
        isNewClauseStart = true;
        newType = 'subordinate_relative';
        newLabel = 'Oração Subordinada Adjetiva Relativa';
        conj = rawText;
      }

      // Particípios: V-PAP, V-AAP, V-RPP
      if (
        morph.startsWith('V-') &&
        morph.includes('P') &&
        (morph.endsWith('N') ||
          morph.endsWith('G') ||
          morph.endsWith('D') ||
          morph.endsWith('A'))
      ) {
        if (currentClauseType !== 'participial' && currentWords.length >= 3) {
          isNewClauseStart = true;
          newType = 'participial';
          newLabel = 'Frase Participial Circunstancial';
        }
      }

      // Se detectou quebra de cláusula e o bloco anterior tem palavras
      if (isNewClauseStart && currentWords.length > 0) {
        clauses.push(
          this.formatClauseNode(
            currentWords,
            currentClauseType,
            currentLabel,
            clauseIdx++,
            currentConjunction,
          ),
        );
        currentWords = [];
        currentClauseType = newType;
        currentLabel = newLabel;
        currentConjunction = conj;
      }

      currentWords.push(w);

      // Pontuação grega de término de oração (ponto final . ou ponto e vírgula/interrogação ;)
      if (
        rawText.endsWith('.') ||
        rawText.endsWith(';') ||
        rawText.endsWith('·')
      ) {
        if (currentWords.length > 0) {
          clauses.push(
            this.formatClauseNode(
              currentWords,
              currentClauseType,
              currentLabel,
              clauseIdx++,
              currentConjunction,
            ),
          );
          currentWords = [];
          currentClauseType = 'main';
          currentLabel = 'Cláusula Principal / Coordenada';
          currentConjunction = undefined;
        }
      }
    }

    if (currentWords.length > 0) {
      clauses.push(
        this.formatClauseNode(
          currentWords,
          currentClauseType,
          currentLabel,
          clauseIdx,
          currentConjunction,
        ),
      );
    }

    // Organiza em árvore hierárquica simples
    const rootClauses: ClauseNode[] = [];
    let currentMain: ClauseNode | null = null;

    for (const cl of clauses) {
      if (cl.clauseType === 'main' || !currentMain) {
        cl.level = 0;
        currentMain = cl;
        rootClauses.push(cl);
      } else {
        cl.level = 1;
        if (!currentMain.children) {
          currentMain.children = [];
        }
        currentMain.children.push(cl);
      }
    }

    return {
      reference: humanRef,
      titlePt: `Análise Estrutural Sintática — ${humanRef}`,
      authorPt: 'TheoSphere Exegetical Engine',
      totalClauses: clauses.length,
      maxNestingDepth: rootClauses.some(
        (r) => r.children && r.children.length > 0,
      )
        ? 1
        : 0,
      rootClauses:
        rootClauses.length > 0
          ? rootClauses
          : [
              {
                id: 'single-clause',
                level: 0,
                clauseType: 'main',
                labelPt: 'Cláusula Principal Unificada',
                textOriginal: words.map((w) => w.word).join(' '),
                textTranslation:
                  textPt || words.map((w) => w.gloss || '').join(' '),
              },
            ],
      isCanonicalPreset: false,
      isAnnotatedTree: false,
      method: 'heuristic-interlinear',
      methodLabelPt: 'Segmentação aproximada (não é árvore sintática anotada)',
    };
  }

  private formatClauseNode(
    words: InterlinearWordRow[],
    type: ClauseType,
    label: string,
    idx: number,
    conjunction?: string,
  ): ClauseNode {
    const textOriginal = words.map((w) => w.word).join(' ');
    const textTranslation = words.map((w) => w.gloss || '').join(' ');

    // Classifica cada palavra segundo o modelo funcional OpenText (S, P, C, A, Conj)
    const syntaxWords = words.map((w) => {
      const morph = (w.morph || '').toUpperCase();
      let role: 'S' | 'P' | 'C' | 'A' | 'Conj' | undefined;

      if (morph.startsWith('V-')) {
        role = 'P'; // Predicator / Verbo
      } else if (
        morph.includes('-N') ||
        morph.includes('N-NS') ||
        morph.includes('T-NS') ||
        morph.includes('R-NS')
      ) {
        role = 'S'; // Subject / Sujeito
      } else if (
        morph.includes('-A') ||
        morph.includes('-D') ||
        morph.includes('N-AS') ||
        morph.includes('N-DS')
      ) {
        role = 'C'; // Complement / Objeto direto ou indireto
      } else if (
        morph.startsWith('PREP') ||
        morph.startsWith('ADV') ||
        morph.includes('PREP')
      ) {
        role = 'A'; // Adjunct / Modificador circunstancial
      } else if (morph.startsWith('CONJ') || morph.startsWith('C-')) {
        role = 'Conj'; // Conjunção conectora
      }

      return {
        word: w.word,
        translit: w.translit || undefined,
        lemma: w.lemma || undefined,
        morph: w.morph || undefined,
        gloss: w.gloss || undefined,
        strongId: w.strongId || undefined,
        role,
      };
    });

    // Procura verbo principal
    const verbWord = words.find((w) => (w.morph || '').startsWith('V-'));
    const mainVerb = verbWord
      ? `${verbWord.word} (${verbWord.morph})`
      : undefined;

    // Procura sujeito nominativo
    const subjWord = words.find((w) => (w.morph || '').includes('-N'));
    const grammaticalSubject = subjWord ? subjWord.word : undefined;

    // Determina o papel funcional geral da oração no padrão OpenText
    let functionalRole: 'S' | 'P' | 'C' | 'A' | 'Conj' = 'P';
    if (
      type === 'subordinate_purpose' ||
      type === 'subordinate_causal' ||
      type === 'subordinate_conditional' ||
      type === 'subordinate_temporal' ||
      type === 'participial' ||
      type === 'prepositional_phrase'
    ) {
      functionalRole = 'A'; // Adjunto adverbial / circunstancial
    } else if (type === 'subordinate_result') {
      functionalRole = 'C'; // Complemento consecutivo
    } else if (type === 'subordinate_relative') {
      functionalRole = 'A'; // Oração adjetival atributiva
    }

    const syntacticDomain: 'Primary' | 'Secondary' | 'Embedded' =
      type === 'main' ? 'Primary' : 'Secondary';

    return {
      id: `clause-${idx}`,
      level: 0,
      clauseType: type,
      labelPt: label,
      conjunction,
      textOriginal,
      textTranslation,
      mainVerb,
      grammaticalSubject,
      functionalRole,
      syntacticDomain,
      words: syntaxWords,
      theologicalNote: `Segmento sintático com ${words.length} termos morfológicos originais.`,
    };
  }

  /**
   * Heurística para montagem estrutural baseada em pontuação e conjunções em português.
   */
  private buildHeuristicTextDiagram(
    humanRef: string,
    textPt: string,
  ): SyntaxDiagramResponse {
    if (!textPt) {
      return {
        reference: humanRef,
        titlePt: `Diagrama de Cláusulas — ${humanRef}`,
        authorPt: 'TheoSphere Exegetical Engine',
        totalClauses: 1,
        maxNestingDepth: 0,
        rootClauses: [
          {
            id: 'fallback-1',
            level: 0,
            clauseType: 'main',
            labelPt: 'Cláusula Principal',
            textOriginal: '',
            textTranslation: '(Texto não localizado no acervo local)',
          },
        ],
        isCanonicalPreset: false,
        isAnnotatedTree: false,
        method: 'heuristic-text',
        methodLabelPt:
          'Segmentação aproximada (não é árvore sintática anotada)',
      };
    }

    // Divide por vírgulas, dois-pontos ou ponto-e-vírgula
    const segments = textPt
      .split(/([,;:—])/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^[,;:—]$/.test(s));
    const rootClauses: ClauseNode[] = [];

    segments.forEach((seg, idx) => {
      let type: ClauseType = idx === 0 ? 'main' : 'subordinate_relative';
      let label =
        idx === 0 ? 'Cláusula Principal' : 'Cláusula Coordenada / Subordinada';

      const lower = seg.toLowerCase();
      if (lower.startsWith('para que') || lower.startsWith('a fim de')) {
        type = 'subordinate_purpose';
        label = 'Cláusula de Propósito';
      } else if (
        lower.startsWith('porque') ||
        lower.startsWith('pois') ||
        lower.startsWith('porquanto')
      ) {
        type = 'subordinate_causal';
        label = 'Cláusula Causal';
      } else if (lower.startsWith('se ') || lower.startsWith('caso ')) {
        type = 'subordinate_conditional';
        label = 'Cláusula Condicional';
      }

      rootClauses.push({
        id: `seg-${idx + 1}`,
        level: idx === 0 ? 0 : 1,
        clauseType: type,
        labelPt: label,
        textOriginal: '',
        textTranslation: seg,
      });
    });

    return {
      reference: humanRef,
      titlePt: `Estrutura Sintática — ${humanRef}`,
      authorPt: 'TheoSphere Exegetical Engine',
      totalClauses: rootClauses.length,
      maxNestingDepth: rootClauses.length > 1 ? 1 : 0,
      rootClauses,
      isCanonicalPreset: false,
      isAnnotatedTree: false,
      method: 'heuristic-text',
      methodLabelPt: 'Segmentação aproximada (não é árvore sintática anotada)',
    };
  }
}
