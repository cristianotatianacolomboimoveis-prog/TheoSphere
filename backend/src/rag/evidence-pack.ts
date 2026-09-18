export type EvidenceKind =
  | 'primary'
  | 'linguistic'
  | 'theological'
  | 'commentary'
  | 'personal'
  | 'cross_reference'
  | 'secondary';

export type EvidenceProvenance =
  | 'bible'
  | 'interlinear'
  | 'lexicon'
  | 'commentary'
  | 'theology'
  | 'personal'
  | 'classic'
  | 'sefaria'
  | 'external';

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  provenance: EvidenceProvenance;
  title: string;
  reference?: string;
  snippet: string;
  score: number;
  rank: number;
  supports?: string[];
  contradicts?: string[];
}

export interface EvidencePack {
  version: 1;
  query: string;
  generatedAt: string;
  items: EvidenceItem[];
  sourceCount: number;
  primaryCount: number;
  hasCounterEvidence: boolean;
  confidence: number;
}
