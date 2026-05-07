import * as fs from 'fs';
import { Client } from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG, RawInputSchema, IngestionChunk } from './config';

/**
 * 🚀 TheoSphere Ingestion Pipeline (Silicon Valley Mode)
 * Especialista em Processamento de Dados Teológicos em Lote
 */

class IngestionError extends Error {
  constructor(message: string, public readonly context?: any) {
    super(message);
    this.name = 'IngestionError';
  }
}

class Pipeline {
  private pgClient: Client;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.pgClient = new Client({
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    });
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  /**
   * Inicializa conexões
   */
  async init() {
    await this.pgClient.connect();
    console.log('✅ Conectado ao PostgreSQL (pgvector)');
  }

  /**
   * Implementação de Retry com Exponential Backoff + Jitter
   */
  private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    let attempt = 0;
    while (attempt < CONFIG.RETRY_LIMIT) {
      try {
        return await fn();
      } catch (error: any) {
        attempt++;
        const isRateLimit = error.status === 429 || error.message?.includes('429');
        if (!isRateLimit && attempt >= CONFIG.RETRY_LIMIT) throw error;

        const delay = CONFIG.INITIAL_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * CONFIG.JITTER_MAX_MS;
        console.warn(`⚠️ [${label}] Falha (Tentativa ${attempt}/${CONFIG.RETRY_LIMIT}). Retrying em ${delay.toFixed(0)}ms...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
    throw new IngestionError(`Falha definitiva após ${CONFIG.RETRY_LIMIT} tentativas: ${label}`);
  }

  /**
   * Gera Embedding via Google Gemini (text-embedding-004)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    return this.withRetry(async () => {
      const model = this.genAI.getGenerativeModel({ model: CONFIG.EMBEDDING_MODEL });
      const result = await model.embedContent(text);
      return result.embedding.values;
    }, 'Gemini Embedding');
  }

  /**
   * Inserção em Lote (Bulk Insert) Defensiva e Idempotente
   */
  private async bulkInsert(chunks: { id: string, content: string, embedding: number[], metadata: any }[]) {
    if (chunks.length === 0) return;

    // Filtra chunks que já existem (Idempotência)
    const ids = chunks.map(c => c.id);
    const existingRes = await this.pgClient.query(
      'SELECT id FROM "ExegeticalChunk" WHERE id = ANY($1)',
      [ids]
    );
    const existingIds = new Set(existingRes.rows.map(r => r.id));
    const newChunks = chunks.filter(c => !existingIds.has(c.id));

    if (newChunks.length === 0) {
      console.log(`⏩ [Batch] ${chunks.length} itens já processados. Pulando...`);
      return;
    }

    // Inserção em lote usando queryRaw com cast para vector
    // Nota: SQL de alta performance usando UNNEST para múltiplos valores
    const query = `
      INSERT INTO "ExegeticalChunk" (id, content, embedding, metadata)
      SELECT * FROM UNNEST($1::text[], $2::text[], $3::vector[], $4::jsonb[])
      ON CONFLICT (id) DO NOTHING
    `;

    const values = [
      newChunks.map(c => c.id),
      newChunks.map(c => c.content),
      newChunks.map(c => `[${c.embedding.join(',')}]`), // Formato literal de vetor para pgvector
      newChunks.map(c => JSON.stringify(c.metadata))
    ];

    await this.pgClient.query(query, values);
    console.log(`📥 [Batch] ${newChunks.length} novos registros inseridos com sucesso.`);
  }

  /**
   * Pipeline Principal de ETL
   */
  async run(filePath: string) {
    try {
      console.log(`📖 Lendo arquivo: ${filePath}...`);
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Validação estrita
      const validatedData = RawInputSchema.parse(rawData);
      console.log(`✅ ${validatedData.length} itens validados.`);

      let currentBatch: any[] = [];
      let totalProcessed = 0;

      for (const item of validatedData) {
        // 1. Gerar Embedding (Ponto de gargalo e custo)
        // Verificamos se o item já existe ANTES de gastar tokens
        const exists = await this.pgClient.query('SELECT 1 FROM "ExegeticalChunk" WHERE id = $1 LIMIT 1', [item.id]);
        
        if (exists.rowCount > 0) {
          totalProcessed++;
          continue; 
        }

        const vector = await this.generateEmbedding(item.text);
        
        currentBatch.push({
          id: item.id,
          content: item.text,
          embedding: vector,
          metadata: item.metadata
        });

        // Processar lote se atingir o tamanho configurado
        if (currentBatch.length >= CONFIG.BATCH_SIZE) {
          await this.bulkInsert(currentBatch);
          currentBatch = [];
        }

        totalProcessed++;
        if (totalProcessed % 50 === 0) {
          console.log(`⏳ Progresso: ${totalProcessed}/${validatedData.length}...`);
        }
      }

      // Inserir restos do último lote
      if (currentBatch.length > 0) {
        await this.bulkInsert(currentBatch);
      }

      console.log('🏁 Pipeline concluído com sucesso!');
    } catch (error) {
      console.error('❌ Erro Fatal no Pipeline:', error);
      process.exit(1);
    } finally {
      await this.pgClient.end();
    }
  }
}

// Execução se chamado diretamente
if (require.main === module) {
  const pipeline = new Pipeline();
  const filePath = process.argv[2] || 'data_to_ingest.json';
  
  pipeline.init().then(() => {
    pipeline.run(filePath);
  });
}
