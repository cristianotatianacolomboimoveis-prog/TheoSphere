import { Test, TestingModule } from '@nestjs/testing';
import {
  EmbeddingService,
  EmbeddingUnavailableError,
  EmbeddingResult,
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
});
