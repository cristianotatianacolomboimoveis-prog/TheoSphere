import { RagContextBuilderService } from './rag-context-builder.service';
import { RagSource } from './rag.service';

describe('RagContextBuilderService — Trechos Fixos de Calvino e Henry (Relevância Estrita)', () => {
  let builder: RagContextBuilderService;

  beforeEach(() => {
    builder = new RagContextBuilderService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  const teologicas = [
    'Qual o significado de João 3:16?',
    'Como Paulo explica a justificação pela fé em Romanos?',
    'O que significa a soberania de Deus no sofrimento em Jó?',
    'Explique o Salmo 23 e o Bom Pastor',
    'Qual a relação entre aliança e lei no Pentateuco?',
  ];

  const naoTeologicasComRuidoAnterior = [
    'Qual a distância de Jerusalém a Belém?',
    'Quantos habitantes tinha a cidade de Roma no século I?',
    'Qual era a moeda usada na província da Judeia sob o domínio romano?',
  ];

  const outrasNaoTeologicas = [
    'Como era a agricultura e a colheita da cevada na Galileia antiga?',
    'Quem era o imperador romano quando Jesus nasceu?',
  ];

  it('as 3 não teológicas que tinham ruído passam a ter 0 trechos, e as outras 2 continuam com 0', () => {
    for (const q of [
      ...naoTeologicasComRuidoAnterior,
      ...outrasNaoTeologicas,
    ]) {
      const sources: RagSource[] = [];
      const ctx = builder.getFallbackCommentaryContextWithSources(q, sources);
      const classicSources = sources.filter((s) => s.type === 'classic');

      expect(classicSources).toHaveLength(0);
      expect(ctx).toBe('');
    }
  });

  it('as 5 perguntas teológicas mantêm os trechos fixos de comentários clássicos no contexto', () => {
    for (const q of teologicas) {
      const sources: RagSource[] = [];
      const ctx = builder.getFallbackCommentaryContextWithSources(q, sources);
      const classicSources = sources.filter((s) => s.type === 'classic');

      expect(classicSources.length).toBeGreaterThan(0);
      expect(ctx).toContain('=== COMENTARISTAS CLÁSSICOS (FALLBACK) ===');
    }
  });

  describe('citesBookAndChapter', () => {
    it('detecta citação direta de livro e capítulo', () => {
      expect(
        builder.citesBookAndChapter(
          'Qual o sentido de João 3:16?',
          'João 3:16',
        ),
      ).toBe(true);
      expect(
        builder.citesBookAndChapter(
          'Explique o Salmo 23 e o Bom Pastor',
          'Salmos 23:1',
        ),
      ).toBe(true);
    });

    it('rejeita menção apenas do livro sem o capítulo', () => {
      expect(
        builder.citesBookAndChapter(
          'Como era a cidade de Roma no século I?',
          'Romanos 3:23',
        ),
      ).toBe(false);
    });
  });
});
