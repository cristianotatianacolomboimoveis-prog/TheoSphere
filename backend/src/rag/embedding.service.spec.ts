import { Test, TestingModule } from '@nestjs/testing';
import {
  EmbeddingService,
  EmbeddingUnavailableError,
  EmbeddingResult,
  attachBatchEmbeddingMetadata,
  assertPersistedBatchEmbeddings,
} from './embedding.service';

describe('EmbeddingService (T0.2 Vector Space Separation)', () => {
  let service: EmbeddingService;

  beforeEach(async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.REDIS_URL;

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmbeddingService],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
  });

  describe('createEmbedding para índices persistidos', () => {
    it('deve lançar EmbeddingUnavailableError quando Gemini não estiver configurado', async () => {
      await expect(service.createEmbedding('João 3:16')).rejects.toThrow(
        EmbeddingUnavailableError,
      );
      await expect(service.createEmbedding('João 3:16')).rejects.toThrow(
        'Provedor primário de embeddings (Google Gemini gemini-embedding-001) não está disponível.',
      );
    });

    it('deve propagar EmbeddingUnavailableError quando a API do Gemini falhar (ex: 429)', async () => {
      // Configurar mock do genAI
      const mockEmbedContent = jest
        .fn()
        .mockRejectedValue(new Error('Quota exceeded 429'));
      (service as any).genAI = {
        models: {
          embedContent: mockEmbedContent,
        },
      };

      await expect(service.createEmbedding('Salmo 23')).rejects.toThrow(
        EmbeddingUnavailableError,
      );
      await expect(service.createEmbedding('Salmo 23')).rejects.toThrow(
        'Quota exceeded 429',
      );
    });

    it('deve retornar EmbeddingResult tipado { vector, provider, model } no sucesso do Gemini', async () => {
      const mockVector = new Array(768).fill(0.05);
      const mockEmbedContent = jest.fn().mockResolvedValue({
        embeddings: [{ values: mockVector }],
      });
      (service as any).genAI = {
        models: {
          embedContent: mockEmbedContent,
        },
      };

      const result = await service.createEmbedding('No princípio');

      expect(result).toBeInstanceOf(EmbeddingResult);
      expect(result.provider).toBe('gemini');
      expect(result.model).toBe('gemini-embedding-001');
      expect(result.dimensions).toBe(768);
      expect(result.vector).toEqual(mockVector);
      expect(result.length).toBe(768);
      // Serialização JSON deve produzir o array numérico diretamente
      expect(JSON.parse(JSON.stringify(result))).toEqual(mockVector);
    });
  });

  describe('Cache com separação de provider:model:dim', () => {
    it('não deve gravar no cache vetores que não sejam do Gemini gemini-embedding-001', async () => {
      const nonGeminiResult = new EmbeddingResult(
        new Array(768).fill(0.1),
        'openai',
        'text-embedding-3-small',
        768,
      );

      const writeCacheSpy = jest.spyOn(service as any, 'setL1');
      await (service as any).writeCache('texto de teste', nonGeminiResult);

      expect(writeCacheSpy).not.toHaveBeenCalled();
    });

    it('grava no cache vetores legítimos do Gemini', async () => {
      const geminiResult = new EmbeddingResult(
        new Array(768).fill(0.2),
        'gemini',
        'gemini-embedding-001',
        768,
      );

      await (service as any).writeCache('texto sagrado', geminiResult);
      const stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('createEphemeralFallbackEmbedding', () => {
    it('deve gerar embedding efêmero via hash local quando não houver chaves', async () => {
      const res =
        await service.createEphemeralFallbackEmbedding('busca temporária');
      expect(res.provider).toBe('local-hash');
      expect(res.model).toBe('deterministic-hash-v1');
      expect(res.vector.length).toBe(768);
    });
  });

  describe('createBatchEmbeddings e assertPersistedBatchEmbeddings (Guarda B1)', () => {
    it('deve retornar lote com metadados não-enumeráveis { provider: gemini, model: gemini-embedding-001, dimensions: 768 }', async () => {
      const v1 = new Array(768).fill(0.11);
      const v2 = new Array(768).fill(0.22);
      const mockEmbedContent = jest.fn().mockResolvedValue({
        embeddings: [{ values: v1 }, { values: v2 }],
      });
      (service as any).genAI = {
        models: {
          embedContent: mockEmbedContent,
        },
      };

      const batch = await service.createBatchEmbeddings(['verso 1', 'verso 2']);
      expect(batch).toHaveLength(2);
      expect(batch.provider).toBe('gemini');
      expect(batch.model).toBe('gemini-embedding-001');
      expect(batch.dimensions).toBe(768);
      expect(Object.keys(batch)).toEqual(['0', '1']);
      expect(() => assertPersistedBatchEmbeddings(batch, 2)).not.toThrow();
    });

    it('deve abortar (caminho de falha) se o provedor não for gemini', () => {
      const poisoned = attachBatchEmbeddingMetadata(
        [new Array(768).fill(0.1)],
        'local-hash',
        'deterministic-hash-v1',
        768,
      );
      expect(() => assertPersistedBatchEmbeddings(poisoned, 1)).toThrow(
        EmbeddingUnavailableError,
      );
      expect(() => assertPersistedBatchEmbeddings(poisoned, 1)).toThrow(
        /provedor 'local-hash' inválido/,
      );
    });

    it('deve abortar (caminho de falha) se dimensions !== 768 ou vetor tiver tamanho incorreto', () => {
      const badDimMeta = attachBatchEmbeddingMetadata(
        [new Array(768).fill(0.1)],
        'gemini',
        'gemini-embedding-001',
        1536,
      );
      expect(() => assertPersistedBatchEmbeddings(badDimMeta, 1)).toThrow(
        /dimensão declarada '1536' inválida/,
      );

      const badVecLen = attachBatchEmbeddingMetadata(
        [new Array(512).fill(0.1)],
        'gemini',
        'gemini-embedding-001',
        768,
      );
      expect(() => assertPersistedBatchEmbeddings(badVecLen, 1)).toThrow(
        /vetor no índice 0 tem dimensão 512/,
      );
    });
  });
});
