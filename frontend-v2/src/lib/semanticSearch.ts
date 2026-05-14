import { pipeline } from '@xenova/transformers';

class SemanticSearchEngine {
  private static instance: SemanticSearchEngine;
  private model: any = null;
  private isInitializing = false;

  private constructor() {}

  public static getInstance(): SemanticSearchEngine {
    if (!SemanticSearchEngine.instance) {
      SemanticSearchEngine.instance = new SemanticSearchEngine();
    }
    return SemanticSearchEngine.instance;
  }

  /**
   * Initializes the local embedding model.
   * Model: all-MiniLM-L6-v2 (Lightweight and fast for browser)
   */
  public async init() {
    if (this.model || this.isInitializing) return;
    this.isInitializing = true;
    
    this.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    this.isInitializing = false;
  }

  /**
   * Generates a vector embedding for a given text.
   */
  public async getEmbedding(text: string) {
    if (!this.model) await this.init();
    const output = await this.model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  }

  /**
   * Calculates cosine similarity between two vectors.
   */
  public cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const semanticSearch = SemanticSearchEngine.getInstance();
