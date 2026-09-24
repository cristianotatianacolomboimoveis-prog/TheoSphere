export type ClauseType =
  | 'main' // Cláusula Principal / Independente
  | 'subordinate_purpose' // Cláusula Subordinada de Propósito / Final (ἵνα, ὅπως)
  | 'subordinate_causal' // Cláusula Subordinada Causal (ὅτι, διότι, ἐπεί)
  | 'subordinate_conditional' // Cláusula Subordinada Condicional (εἰ, ἐάν)
  | 'subordinate_temporal' // Cláusula Subordinada Temporal (ὅτε, ὡς, ἐν ᾧ)
  | 'subordinate_result' // Cláusula Subordinada Consecutiva / Resultado (ὥστε)
  | 'subordinate_relative' // Oração Subordinada Adjetiva Relativa (ὅς, ἥ, ὅ)
  | 'participial' // Frase ou Cláusula Participial (Circunstancial ou Adjetival)
  | 'infinitive_phrase' // Frase Infinitival (propósito, resultado, substantivada)
  | 'prepositional_phrase' // Frase Preposicional com Peso Teológico
  | 'vocative_apposition'; // Vocativo ou Aposição Exegética

export interface ClauseNode {
  id: string;
  level: number; // 0 = Cláusula raiz / principal, 1..N = níveis de subordinação
  clauseType: ClauseType;
  labelPt: string; // Ex: "Cláusula Principal", "Propósito (Final)", "Causal", etc.
  conjunction?: string; // Conjunção conectora (ex: ἵνα, ὅτι, καθώς)
  textOriginal: string; // Texto no original (Grego/Hebraico)
  textTranslation: string; // Texto em Português
  grammaticalSubject?: string; // Sujeito gramatical
  mainVerb?: string; // Verbo regente da oração
  theologicalNote?: string; // Insight exegético/teológico da conexão
  children?: ClauseNode[];
}

export interface SyntaxDiagramResponse {
  reference: string; // Ex: "EPH 1:3-4" ou "JHN 1:1"
  titlePt: string; // Ex: "Doxologia da Eleição Eterna"
  authorPt: string; // Ex: "Apóstolo Paulo"
  totalClauses: number;
  maxNestingDepth: number;
  rootClauses: ClauseNode[];
  isCanonicalPreset: boolean;
}

export interface CanonicalDiagramSummary {
  id: string;
  reference: string;
  titlePt: string;
  themePt: string;
  testament: 'NT' | 'OT';
  clauseCount: number;
}
