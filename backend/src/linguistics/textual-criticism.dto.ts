export type ManuscriptFamily =
  | 'Alexandrian' // Alexandrino (א, B, P75, P66, etc.)
  | 'Byzantine' // Bizantino / Majoritário (TR, KJV base)
  | 'Western' // Ocidental (D - Bezae)
  | 'Caesarean' // Cesareense (famílias 1 e 13)
  | 'Proto-Masoretic' // Proto-Massorético (Leningrado B19A, Aleppo)
  | 'Qumran_DSS' // Manuscritos do Mar Morto (1QIsa, 4QSam, etc.)
  | 'Septuagint_LXX' // Septuaginta (Antigo Testamento Grego)
  | 'Samaritan_SP'; // Pentateuco Samaritano

export type CriticalRating = 'A' | 'B' | 'C' | 'D'; // Padrão UBS/NA28 (A = virtualmente certo, D = alta incerteza)

export type VariantType =
  | 'omission' // Omissão textual
  | 'addition' // Acréscimo / interpolação
  | 'substitution' // Substituição de vocábulo
  | 'transposition' // Mudança de ordem das palavras
  | 'orthographic' // Variação ortográfica / dialectal
  | 'harmonization' // Harmonização deliberada ou assimilativa
  | 'conflation'; // Conflação de duas leituras anteriores

export interface ManuscriptReading {
  witnessSiglum: string; // Ex: "1QIsaᵃ", "Codex Sinaiticus (א)", "Codex Vaticanus (B)", "MT (Leningrado)", "TR (1550)"
  witnessDate: string; // Ex: "c. 125 a.C.", "séc. IV d.C.", "1008 d.C."
  family: ManuscriptFamily;
  originalText: string; // Leitura exata no idioma original (Grego/Hebraico)
  translationPt: string; // Tradução em Português
  isAdoptedByModernEclectic: boolean; // Se adotado pelas edições críticas modernas (NA28/BHS)
  isAdoptedByTraditionalTR: boolean; // Se adotado pela tradição da Reforma / KJV
}

export interface TextualVariantItem {
  id: string;
  bookId: number;
  bookNamePt: string;
  chapter: number;
  verse: number;
  passageRef: string; // Ex: "Isaías 53:11" ou "1 João 5:7-8"
  unitTitlePt: string; // Título da unidade de variação
  variantType: VariantType;
  criticalRating: CriticalRating;
  theologicalImpact: 'high' | 'medium' | 'low' | 'none';
  historicalContextPt: string;
  scribalCausePt: string; // Causa provável do erro (ex: Homoioteleuton, ditografia, harmonização litúrgica)
  readings: ManuscriptReading[];
  scholarlyConsensusPt: string;
}

export interface TextualCriticismSummary {
  id: string;
  passageRef: string;
  unitTitlePt: string;
  testament: 'OT' | 'NT';
  variantType: VariantType;
  criticalRating: CriticalRating;
  theologicalImpact: 'high' | 'medium' | 'low' | 'none';
  dssOrEarlyPapyriInvolved: boolean;
}

export interface TextualCriticismFilterDto {
  testament?: 'OT' | 'NT';
  theologicalImpact?: 'high' | 'medium' | 'low' | 'none';
  searchQuery?: string;
  bookId?: number;
}
