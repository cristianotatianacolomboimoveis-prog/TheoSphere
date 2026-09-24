import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ConstructBlock,
  ConstructPreset,
  ConstructSearchQueryDto,
  ConstructSearchResult,
  ConstructVerseMatch,
  MatchedWordItem,
} from './construct-search.dto';
import { CONSTRUCT_PRESETS } from './construct-presets';
import { BOOK_ID_TO_NAME_PT } from '../common/book-map';
import { InterlinearWordRow } from './linguistics.service';

@Injectable()
export class ConstructSearchService {
  private readonly logger = new Logger(ConstructSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna os presets de buscas sintáticas célebres.
   */
  getPresets(): ConstructPreset[] {
    return CONSTRUCT_PRESETS;
  }

  /**
   * Verifica se uma palavra do texto interlinear atende aos critérios gramaticais de um bloco de sintaxe.
   */
  matchWord(word: InterlinearWordRow, block: ConstructBlock): boolean {
    const morph = word.morph || '';

    // 1. Verificação por Lema ou Strong ID
    if (
      block.strongId &&
      word.strongId.toUpperCase() !== block.strongId.toUpperCase()
    ) {
      return false;
    }

    if (block.lemma) {
      const cleanWordLemma = (word.lemma || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const cleanTargetLemma = block.lemma
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (!cleanWordLemma.includes(cleanTargetLemma)) {
        return false;
      }
    }

    // 2. Verificação direta por morphPattern
    if (block.morphPattern && !morph.includes(block.morphPattern)) {
      return false;
    }

    // 3. Verificação por Classe Gramatical (Part of Speech)
    if (block.partOfSpeech) {
      const pos = block.partOfSpeech.toUpperCase();
      if (pos === 'CONJ' || pos === 'C') {
        if (!morph.startsWith('CONJ') && !morph.startsWith('C')) return false;
      } else if (pos === 'PREP' || pos === 'R') {
        if (!morph.startsWith('PREP') && !morph.startsWith('R')) return false;
      } else if (pos === 'ADV' || pos === 'D') {
        if (!morph.startsWith('ADV') && !morph.startsWith('D')) return false;
      } else {
        // Ex: 'N', 'V', 'T', 'A', 'P'
        if (!morph.startsWith(`${pos}-`) && !morph.startsWith(pos)) {
          return false;
        }
      }
    }

    // 4. Verificação de Caso Gramatical (Grego: Nominativo, Genitivo, Dativo, Acusativo, Vocativo)
    if (block.grammaticalCase) {
      const c = block.grammaticalCase.toUpperCase();
      // Nos códigos Robinson/STEP, o caso costuma aparecer após o traço, ex: N-NSM, V-AAP-NSM, T-GSM
      // O padrão para grego nominal/verbal é [Tempo][Voz][Modo]-[Caso][Número][Gênero] ou [POS]-[Caso][Número][Gênero]
      const parts = morph.split('-');
      const caseSegment = parts.length > 1 ? parts[parts.length - 1] : '';
      if (!caseSegment.startsWith(c) && !morph.includes(`-${c}`)) {
        return false;
      }
    }

    // 5. Verificação de Modo Verbal (Indicativo, Subjuntivo, Imperativo, Infinitivo, Particípio)
    if (block.mood) {
      const m = block.mood.toUpperCase();
      // Em Verbos: V-[Tempo][Voz][Modo] -> ex: V-PAI, V-AAS, V-PAN, V-AAP
      if (!morph.startsWith('V-')) return false;
      const verbCode = morph.split('-')[1] || '';
      // Terceiro caractere do segmento verbal é o Modo (ex: PAI -> I, AAS -> S, PAN -> N, AAP -> P)
      if (verbCode.length >= 3 && verbCode[2] !== m && !verbCode.includes(m)) {
        return false;
      }
    }

    // 6. Verificação de Tempo Verbal (Presente, Aoristo, Perfeito, etc.)
    if (block.tense) {
      const t = block.tense.toUpperCase();
      if (!morph.startsWith('V-')) return false;
      const verbCode = morph.split('-')[1] || '';
      if (verbCode.length >= 1 && verbCode[0] !== t) {
        return false;
      }
    }

    // 7. Verificação de Voz Verbal (Ativa, Média, Passiva)
    if (block.voice) {
      const v = block.voice.toUpperCase();
      if (!morph.startsWith('V-')) return false;
      const verbCode = morph.split('-')[1] || '';
      if (verbCode.length >= 2 && verbCode[1] !== v) {
        return false;
      }
    }

    // 8. Verificação de Gênero e Número
    if (block.gender || block.number) {
      const parts = morph.split('-');
      const agreementSeg = parts.length > 1 ? parts[parts.length - 1] : '';
      if (
        block.number &&
        agreementSeg.length >= 2 &&
        agreementSeg[1] !== block.number.toUpperCase()
      ) {
        return false;
      }
      if (
        block.gender &&
        agreementSeg.length >= 3 &&
        agreementSeg[2] !== block.gender.toUpperCase()
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Executa a busca de blocos sintáticos no corpus bíblico.
   */
  async executeQuery(
    query: ConstructSearchQueryDto,
  ): Promise<ConstructSearchResult> {
    const startTime = Date.now();
    const limit = query.limit || 50;

    if (!query.blocks || query.blocks.length === 0) {
      return {
        query,
        totalMatches: 0,
        verses: [],
        distributionByBook: {},
        executionTimeMs: 0,
      };
    }

    const firstBlock = query.blocks[0];

    // Monta filtro Prisma inicial para pré-seleção eficiente
    const whereFirst: any = {};
    if (query.scopeBookId) {
      whereFirst.bookId = query.scopeBookId;
    } else {
      // Se língua for grego, restringe aos 27 livros do NT (40 a 66)
      if (query.language === 'greek') {
        whereFirst.bookId = { gte: 40, lte: 66 };
      }
    }

    if (firstBlock.strongId) {
      whereFirst.strongId = firstBlock.strongId;
    }

    // Busca palavras candidatas para o primeiro bloco
    const candidateRows = await this.prisma.interlinearWord.findMany({
      where: whereFirst,
      take: 2000,
      orderBy: [
        { bookId: 'asc' },
        { chapter: 'asc' },
        { verse: 'asc' },
        { position: 'asc' },
      ],
    });

    // Filtra pelo matchWord
    const validFirstMatches = candidateRows.filter((w) =>
      this.matchWord(w, firstBlock),
    );

    // Agrupa por versículo único (bookId, chapter, verse)
    const candidateVerses = new Map<
      string,
      { bookId: number; chapter: number; verse: number }
    >();
    for (const w of validFirstMatches) {
      const key = `${w.bookId}-${w.chapter}-${w.verse}`;
      if (!candidateVerses.has(key)) {
        candidateVerses.set(key, {
          bookId: w.bookId,
          chapter: w.chapter,
          verse: w.verse,
        });
      }
    }

    const matchedVerses: ConstructVerseMatch[] = [];
    const distributionByBook: Record<string, number> = {};

    // Para cada versículo candidato, carrega todas as palavras e verifica a sequência sintática
    for (const { bookId, chapter, verse } of candidateVerses.values()) {
      if (matchedVerses.length >= limit) break;

      const verseWords = await this.prisma.interlinearWord.findMany({
        where: { bookId, chapter, verse },
        orderBy: { position: 'asc' },
      });

      const words = verseWords as InterlinearWordRow[];
      const matchedSequence = this.findSequenceInVerse(
        words,
        query.blocks,
        query.distance,
      );

      if (matchedSequence) {
        // Busca o texto bíblico em português para contexto
        const bibleVerse = await this.prisma.bibleVerse.findFirst({
          where: {
            bookId,
            chapter,
            verse,
            translation: 'BLIVRE',
          },
          select: { text: true },
        });

        const bookName = BOOK_ID_TO_NAME_PT[bookId] || `Livro ${bookId}`;
        const displayRef = `${bookName} ${chapter}:${verse}`;

        matchedVerses.push({
          bookId,
          bookName,
          chapter,
          verse,
          displayRef,
          textPt: bibleVerse?.text || '',
          matchedWords: matchedSequence,
        });

        distributionByBook[bookName] = (distributionByBook[bookName] || 0) + 1;
      }
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      query,
      totalMatches: matchedVerses.length,
      verses: matchedVerses,
      distributionByBook,
      executionTimeMs,
    };
  }

  /**
   * Encontra uma sequência de palavras que satisfaz os blocos sintáticos sob as regras de distância.
   */
  private findSequenceInVerse(
    words: InterlinearWordRow[],
    blocks: ConstructBlock[],
    distance: 'adjacent' | 'within_3' | 'same_verse',
  ): MatchedWordItem[] | null {
    if (words.length < blocks.length) return null;

    // Busca backtracking
    const searchFromIndex = (
      wordIdx: number,
      blockIdx: number,
      currentMatched: MatchedWordItem[],
    ): MatchedWordItem[] | null => {
      if (blockIdx === blocks.length) {
        return currentMatched;
      }

      const targetBlock = blocks[blockIdx];

      for (let i = wordIdx; i < words.length; i++) {
        const w = words[i];

        // Se houver palavra anterior, valida restrição de distância
        if (currentMatched.length > 0) {
          const prevPosition =
            currentMatched[currentMatched.length - 1].position;
          const posDiff = w.position - prevPosition;

          if (distance === 'adjacent' && posDiff !== 1) {
            continue;
          }
          if (distance === 'within_3' && (posDiff < 1 || posDiff > 3)) {
            continue;
          }
          if (distance === 'same_verse' && posDiff < 1) {
            continue;
          }
        }

        if (this.matchWord(w, targetBlock)) {
          const matchedItem: MatchedWordItem = {
            position: w.position,
            word: w.word,
            translit: w.translit,
            gloss: w.gloss,
            strongId: w.strongId,
            morph: w.morph,
            lemma: w.lemma,
            blockId: targetBlock.id,
          };

          const next = searchFromIndex(i + 1, blockIdx + 1, [
            ...currentMatched,
            matchedItem,
          ]);
          if (next) return next;
        }
      }

      return null;
    };

    return searchFromIndex(0, 0, []);
  }
}
