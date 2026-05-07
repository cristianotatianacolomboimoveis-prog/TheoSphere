import { z } from 'zod';

/**
 * CONFIGURAÇÕES GLOBAIS
 */
export const CONFIG = {
  BATCH_SIZE: 100, // Processar em blocos de 100 para equilíbrio entre IO e Memória
  EMBEDDING_MODEL: 'text-embedding-004',
  VECTOR_DIM: 768,
  RETRY_LIMIT: 5,
  INITIAL_BACKOFF_MS: 1000,
  JITTER_MAX_MS: 500,
  TIMEOUT_MS: 30000, // 30s timeout para chamadas de API
};

/**
 * TIPAGEM ESTRITA VIA ZOD (Defensivo)
 */
export const MetadataSchema = z.object({
  book: z.string().optional(),
  chapter: z.number().optional(),
  verse_start: z.number().optional(),
  verse_end: z.number().optional(),
  type: z.enum(['biblical_text', 'dictionary', 'commentary', 'character']),
  source: z.string(),
  author: z.string().optional(),
  testament: z.enum(['AT', 'NT']).optional(),
});

export const RawInputSchema = z.array(z.object({
  id: z.string(),
  text: z.string(),
  metadata: MetadataSchema
}));

export type IngestionChunk = z.infer<typeof RawInputSchema>[number];
export type Metadata = z.infer<typeof MetadataSchema>;

/**
 * INTERFACES DE SERVIÇO
 */
export interface EmbeddingResponse {
  vector: number[];
  tokensUsed: number;
}
