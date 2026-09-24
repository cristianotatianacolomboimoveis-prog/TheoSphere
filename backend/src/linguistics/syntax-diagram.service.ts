import { Injectable, Logger } from '@nestjs/common';
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
import { BOOK_ID_TO_NAME_PT, resolveBookId } from '../common/book-map';
import { InterlinearWordRow } from './linguistics.service';

@Injectable()
export class SyntaxDiagramService {
  private readonly logger = new Logger(SyntaxDiagramService.name);

  constructor(private readonly prisma: PrismaService) {}

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
    const canonicalKey = `${bookInput.toUpperCase()}.${chapter}.${verse}`;
    // Verifica se há pré-definido correspondente
    for (const [k, diagram] of Object.entries(CANONICAL_DIAGRAMS)) {
      if (k.startsWith(canonicalKey) || k === canonicalKey) {
        return diagram;
      }
    }

    const numericBookId = Number(bookInput) || resolveBookId(bookInput) || 1;
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

    // Procura verbo principal
    const verbWord = words.find((w) => (w.morph || '').startsWith('V-'));
    const mainVerb = verbWord
      ? `${verbWord.word} (${verbWord.morph})`
      : undefined;

    // Procura sujeito nominativo
    const subjWord = words.find((w) => (w.morph || '').includes('-N'));
    const grammaticalSubject = subjWord ? subjWord.word : undefined;

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
    };
  }
}
