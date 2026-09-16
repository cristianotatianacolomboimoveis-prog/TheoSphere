import { Injectable } from '@nestjs/common';
import type { EvidenceItem, EvidenceKind, EvidencePack, EvidenceProvenance } from './evidence-pack';
import type { RagSource } from './rag.service';

export interface EvidenceInput {
  source: RagSource;
  kind?: EvidenceKind;
  provenance?: EvidenceProvenance;
  supports?: string[];
  contradicts?: string[];
}

/**
 * Converts heterogeneous retrieval results into a small, deterministic contract
 * that can be consumed by reranking, RAG generation and auditing independently.
 * No LLM call happens here: ordering, de-duplication and confidence are stable.
 */
@Injectable()
export class EvidencePackService {
  build(query: string, inputs: EvidenceInput[], maxItems = 24): EvidencePack {
    const boundedMax = Math.min(Math.max(Math.trunc(maxItems), 1), 100);
    const byKey = new Map<string, EvidenceItem>();

    for (const input of inputs) {
      const source = input.source;
      const title = (source.title ?? '').trim();
      const snippet = (source.snippet ?? '').trim();
      if (!title || !snippet) continue;

      const score = this.normalizeScore(source.score);
      const provenance = input.provenance ?? this.inferProvenance(source.type);
      const kind = input.kind ?? this.inferKind(provenance);
      const reference = source.reference?.trim() || undefined;
      const id = this.makeId(provenance, title, reference, snippet);
      const key = `${kind}|${provenance}|${title.toLocaleLowerCase()}|${reference ?? ''}|${snippet.toLocaleLowerCase()}`;

      const candidate: EvidenceItem = {
        id,
        kind,
        provenance,
        title,
        reference,
        snippet,
        score,
        rank: 0,
        supports: this.cleanClaims(input.supports),
        contradicts: this.cleanClaims(input.contradicts),
      };

      const existing = byKey.get(key);
      if (!existing || candidate.score > existing.score) {
        byKey.set(key, candidate);
      }
    }

    const items = [...byKey.values()]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.provenance !== b.provenance) return a.provenance.localeCompare(b.provenance);
        return a.id.localeCompare(b.id);
      })
      .slice(0, boundedMax)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    const primaryCount = items.filter((item) =>
      item.kind === 'primary' || item.kind === 'linguistic',
    ).length;
    const hasCounterEvidence = items.some((item) =>
      (item.contradicts?.length ?? 0) > 0,
    );

    return {
      version: 1,
      query: query.trim(),
      generatedAt: new Date().toISOString(),
      items,
      sourceCount: items.length,
      primaryCount,
      hasCounterEvidence,
      confidence: this.computeConfidence(items),
    };
  }

  private normalizeScore(value?: number): number {
    if (!Number.isFinite(value)) return 0.5;
    return Math.min(Math.max(Number(value), 0), 1);
  }

  private computeConfidence(items: EvidenceItem[]): number {
    if (items.length === 0) return 0;
    const weighted = items.reduce((sum, item, index) => {
      const rankWeight = 1 / (index + 1);
      return sum + item.score * rankWeight;
    }, 0);
    const normalization = items.reduce((sum, _, index) => sum + 1 / (index + 1), 0);
    const primaryBonus = items.some((item) => item.kind === 'primary') ? 0.1 : 0;
    const linguisticBonus = items.some((item) => item.kind === 'linguistic') ? 0.05 : 0;
    return Math.min(1, Number((weighted / normalization + primaryBonus + linguisticBonus).toFixed(4)));
  }

  private inferProvenance(type: RagSource['type']): EvidenceProvenance {
    switch (type) {
      case 'bible': return 'bible';
      case 'lexicon': return 'lexicon';
      case 'commentary': return 'commentary';
      case 'personal': return 'personal';
      case 'classic': return 'classic';
      case 'sefaria': return 'sefaria';
      default: return 'theology';
    }
  }

  private inferKind(provenance: EvidenceProvenance): EvidenceKind {
    switch (provenance) {
      case 'bible':
      case 'interlinear': return 'primary';
      case 'lexicon': return 'linguistic';
      case 'commentary': return 'commentary';
      case 'personal': return 'personal';
      default: return 'secondary';
    }
  }

  private cleanClaims(claims?: string[]): string[] | undefined {
    const cleaned = (claims ?? [])
      .map((claim) => claim.trim())
      .filter(Boolean)
      .slice(0, 8);
    return cleaned.length ? [...new Set(cleaned)] : undefined;
  }

  private makeId(
    provenance: EvidenceProvenance,
    title: string,
    reference: string | undefined,
    snippet: string,
  ): string {
    const raw = `${provenance}|${title}|${reference ?? ''}|${snippet}`.toLowerCase();
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i += 1) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `evi_${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }
}
