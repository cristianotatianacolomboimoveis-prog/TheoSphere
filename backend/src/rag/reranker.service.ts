import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

/**
 * RerankerService — Cross-encoder reranking via Gemini Flash.
 *
 * Bi-encoders (embedding search) are fast but lose nuance: they encode query
 * and document independently, so they can't model fine-grained interaction
 * between them. A cross-encoder sees both at once and scores relevance
 * directly — dramatically better for theological queries like
 * "relação entre justificação e santificação em Romanos".
 *
 * Architecture:
 *   1. Bi-encoder retrieves top-N candidates (pgvector ANN, ~5ms)
 *   2. This service re-scores top-N with Gemini Flash (~200ms for 15 docs)
 *   3. Return top-K by cross-encoder score
 *
 * Cost: Gemini 2.5 Flash at $0.15/1M input tokens. 15 docs × ~200 tokens
 * each + query ≈ 3500 tokens ≈ $0.000525 per rerank call. Negligible.
 *
 * Fallback: If Gemini is unavailable, falls back to keyword-overlap
 * (the previous naive reranker), so the pipeline never breaks.
 */

export interface RerankCandidate {
  /** The text content to score against the query */
  content: string;
  /** Original data carried through (preserved in output) */
  [key: string]: any;
}

export interface RerankResult {
  /** Cross-encoder relevance score (0–10, higher = more relevant) */
  crossEncoderScore: number;
  /** Original candidate data */
  [key: string]: any;
}

@Injectable()
export class RerankerService {
  private readonly logger = new Logger(RerankerService.name);
  private genAI: GoogleGenAI | null = null;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenAI({ apiKey: geminiKey });
    }
  }

  /**
   * Rerank candidates using Gemini Flash as a cross-encoder.
   *
   * @param query  - The user's search query
   * @param candidates - Documents to rerank (must have `content` or `text` field)
   * @param topK - Number of top results to return
   * @returns Reranked candidates sorted by cross-encoder score
   */
  async rerank(
    query: string,
    candidates: any[],
    topK: number,
  ): Promise<RerankResult[]> {
    if (!candidates || candidates.length === 0) return [];
    if (candidates.length <= topK && !this.genAI) return candidates;

    // If no Gemini available, fall back to keyword overlap
    if (!this.genAI) {
      return this.keywordFallback(query, candidates, topK);
    }

    // Prepare documents for scoring — truncate to save tokens
    const docs = candidates.map((c, i) => {
      const text = (c.content || c.text || '').slice(0, 400);
      return { index: i, text };
    });

    try {
      const prompt = this.buildRerankPrompt(query, docs);

      const result = await Promise.race([
        this.genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0,
            maxOutputTokens: 200,
            responseMimeType: 'application/json',
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Rerank timeout 8s')), 8000),
        ),
      ]);

      const raw = (result as any).text ?? '';
      const scores = this.parseScores(raw, candidates.length);

      // Merge scores back into candidates
      const scored = candidates.map((c, i) => ({
        ...c,
        crossEncoderScore: scores[i] ?? 0,
      }));

      scored.sort((a, b) => b.crossEncoderScore - a.crossEncoderScore);

      this.logger.debug(
        `[Reranker] Cross-encoder scored ${candidates.length} docs → top score: ${scored[0]?.crossEncoderScore}`,
      );

      return scored.slice(0, topK);
    } catch (err) {
      this.logger.warn(
        `[Reranker] Cross-encoder failed: ${(err as Error).message} — falling back to keyword overlap`,
      );
      return this.keywordFallback(query, candidates, topK);
    }
  }

  /**
   * Build a compact prompt that asks Gemini to score each document.
   */
  private buildRerankPrompt(
    query: string,
    docs: { index: number; text: string }[],
  ): string {
    const docList = docs
      .map((d) => `[${d.index}]: ${d.text}`)
      .join('\n---\n');

    return `You are a theological relevance judge. Score how relevant each document is to the query.
Return a JSON array of numbers (0-10 scale, 10 = perfectly relevant).
Array position i = score for document [i]. Return ONLY the JSON array, nothing else.

QUERY: "${query}"

DOCUMENTS:
${docList}`;
  }

  /**
   * Parse the LLM response into an array of scores.
   * Handles edge cases: extra text, malformed JSON, etc.
   */
  private parseScores(raw: string, expectedLength: number): number[] {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => {
          const n = Number(v);
          return isNaN(n) ? 0 : Math.min(10, Math.max(0, n));
        });
      }
    } catch {
      // Try to extract array from response
      const match = raw.match(/\[[\d,.\s]+\]/);
      if (match) {
        try {
          const arr = JSON.parse(match[0]);
          return arr.map((v: any) => {
            const n = Number(v);
            return isNaN(n) ? 0 : Math.min(10, Math.max(0, n));
          });
        } catch {
          // fall through
        }
      }
    }

    // If all parsing fails, return zeros
    this.logger.warn(`[Reranker] Could not parse scores from: ${raw.slice(0, 100)}`);
    return new Array(expectedLength).fill(5);
  }

  /**
   * Keyword-overlap fallback (the previous naive reranker).
   * Used when Gemini is unavailable.
   */
  private keywordFallback(
    query: string,
    documents: any[],
    limit: number,
  ): any[] {
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const scored = documents.map((doc) => {
      const content = (doc.content || doc.text || '').toLowerCase();
      const overlap = queryWords.reduce(
        (acc, word) => acc + (content.includes(word) ? 1 : 0),
        0,
      );
      const originalSimilarity = doc.similarity || 1 - (doc.distance || 0);
      const crossEncoderScore = originalSimilarity * 10 + overlap * 0.5;
      return { ...doc, crossEncoderScore };
    });

    return scored
      .sort((a, b) => b.crossEncoderScore - a.crossEncoderScore)
      .slice(0, limit);
  }
}
