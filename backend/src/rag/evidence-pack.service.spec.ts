import { EvidencePackService } from './evidence-pack.service';
import type { RagSource } from './rag.service';

describe('EvidencePackService', () => {
  const service = new EvidencePackService();

  const source = (overrides: Partial<RagSource> = {}): RagSource => ({
    type: 'bible',
    title: 'Bíblia',
    reference: 'João 3:16',
    snippet: 'Porque Deus amou o mundo...',
    score: 0.92,
    ...overrides,
  });

  it('deduplica evidências equivalentes e mantém a de maior score', () => {
    const pack = service.build('amor de Deus', [
      { source: source({ score: 0.7 }) },
      { source: source({ score: 0.95 }) },
    ]);

    expect(pack.sourceCount).toBe(1);
    expect(pack.items[0]).toMatchObject({ score: 0.95, rank: 1 });
  });

  it('ordena deterministicamente e limita o volume', () => {
    const pack = service.build(
      'teste',
      [
        { source: source({ title: 'B', reference: '2', score: 0.8 }) },
        { source: source({ title: 'A', reference: '1', score: 0.8 }) },
        { source: source({ title: 'C', reference: '3', score: 0.4 }) },
      ],
      2,
    );

    expect(pack.items).toHaveLength(2);
    expect(pack.items.map((item) => item.rank)).toEqual([1, 2]);
    expect(pack.items[0].title).toBe('A');
    expect(pack.items[1].title).toBe('B');
  });

  it('infere evidência linguística para léxico e primary para Bíblia', () => {
    const pack = service.build('João 3:16', [
      { source: source({ type: 'lexicon', title: 'Strong G25', score: 0.9 }) },
      { source: source({ type: 'bible', title: 'BLIVRE', score: 0.8 }) },
    ]);

    expect(pack.items.map((item) => item.kind)).toContain('linguistic');
    expect(pack.items.map((item) => item.kind)).toContain('primary');
    expect(pack.primaryCount).toBe(1);
  });

  it('remove claims vazias, limita claims e sinaliza contra-evidência', () => {
    const pack = service.build('debate', [
      {
        source: source({ type: 'theology', score: 0.6 }),
        supports: ['', ' tese A ', 'tese A'],
        contradicts: [' tese B ', ''],
      },
    ]);

    expect(pack.hasCounterEvidence).toBe(true);
    expect(pack.items[0].supports).toEqual(['tese A']);
    expect(pack.items[0].contradicts).toEqual(['tese B']);
  });

  it('retorna confiança zero quando não há evidências', () => {
    const pack = service.build('vazio', []);
    expect(pack).toMatchObject({
      sourceCount: 0,
      primaryCount: 0,
      hasCounterEvidence: false,
      confidence: 0,
    });
  });
});
