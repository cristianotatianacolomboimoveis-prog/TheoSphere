/**
 * construct-search.dto.ts — Tipos e interfaces para o Construtor Visual de Sintaxe (Construct Search).
 * Inspirado no motor de busca sintático-morfológica do Accordance Bible Software.
 */

export type ConstructLanguage = 'greek' | 'hebrew';
export type ConstructDistance = 'adjacent' | 'within_3' | 'same_verse';

export interface ConstructBlock {
  id: string;
  partOfSpeech?: 'N' | 'V' | 'A' | 'T' | 'R' | 'C' | 'P' | 'D' | string; // Substantivo, Verbo, Adjetivo, Artigo, Prep, Conj, Pronome, Adv
  grammaticalCase?: 'N' | 'G' | 'D' | 'A' | 'V'; // Nominativo, Genitivo, Dativo, Acusativo, Vocativo
  number?: 'S' | 'P'; // Singular, Plural
  gender?: 'M' | 'F' | 'N'; // Masc, Fem, Neutro
  tense?: 'P' | 'I' | 'F' | 'A' | 'R' | 'L'; // Presente, Imperfeito, Futuro, Aoristo, Perfeito, Mais-que-perfeito
  voice?: 'A' | 'M' | 'P' | 'D'; // Ativa, Média, Passiva, Depoente
  mood?: 'I' | 'S' | 'O' | 'M' | 'N' | 'P'; // Indicativo, Subjuntivo, Optativo, Imperativo, Infinitivo, Particípio
  lemma?: string;
  strongId?: string;
  morphPattern?: string; // Regex ou substring direta no código morfológico
  label?: string;
}

export class ConstructSearchQueryDto {
  language!: ConstructLanguage;
  blocks!: ConstructBlock[];
  distance!: ConstructDistance;
  scopeBookId?: number;
  limit?: number;
}

export interface MatchedWordItem {
  position: number;
  word: string;
  translit: string;
  gloss: string;
  strongId: string;
  morph: string | null;
  lemma: string | null;
  blockId: string;
}

export interface ConstructVerseMatch {
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  displayRef: string;
  textPt: string;
  matchedWords: MatchedWordItem[];
}

export interface ConstructSearchResult {
  query: ConstructSearchQueryDto;
  totalMatches: number;
  verses: ConstructVerseMatch[];
  distributionByBook: Record<string, number>;
  executionTimeMs: number;
}

export interface ConstructPreset {
  id: string;
  title: string;
  language: ConstructLanguage;
  description: string;
  significance: string;
  sampleRef: string;
  distance: ConstructDistance;
  blocks: ConstructBlock[];
}
