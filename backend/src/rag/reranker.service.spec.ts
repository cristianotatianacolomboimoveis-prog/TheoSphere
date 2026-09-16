import { RerankerService } from './reranker.service';

describe('RerankerService', () => {
  it('uses a deterministic fallback when Gemini is unavailable', async () => {
    const service = new RerankerService();
    const docs = [
      { id: 'a', text: 'justificação pela fé', similarity: 0.8 },
      { id: 'b', text: 'genealogia e reis', similarity: 0.2 },
    ];

    const out = await service.rerank('justificação pela fé', docs, 2);

    expect(out.map((d) => d.id)).toEqual(['a', 'b']);
    expect(out[0].crossEncoderScore).toBeGreaterThan(out[1].crossEncoderScore);
  });

  it('always respects topK bounds', async () => {
    const service = new RerankerService();
    const docs = [
      { id: 'a', text: 'one', similarity: 0.1 },
      { id: 'b', text: 'two', similarity: 0.2 },
    ];

    expect(await service.rerank('query', docs, 0)).toHaveLength(1);
    expect(await service.rerank('query', docs, 99)).toHaveLength(2);
  });

  it('falls back when no usable retrieval score exists', async () => {
    const service = new RerankerService();
    const docs = [
      { id: 'a', text: 'relevante aqui' },
      { id: 'b', text: 'distante' },
    ];

    const out = await service.rerank('relevante aqui', docs, 2);

    expect(out[0].id).toBe('a');
    expect(out[0]).toHaveProperty('crossEncoderScore');
  });
});
