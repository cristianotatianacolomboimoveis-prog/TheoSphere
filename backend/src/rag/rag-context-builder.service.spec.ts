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

  const teologicasComPassagemNoAcervo = [
    'Qual o significado de João 3:16?',
    'Explique o Salmo 23 e o Bom Pastor',
  ];

  const teologicasSemPassagemNoAcervo = [
    'Como Paulo explica a justificação pela fé em Romanos?',
    'O que significa a soberania de Deus no sofrimento em Jó?',
    'Qual a relação entre aliança e lei no Pentateuco?',
  ];

  const naoTeologicas = [
    'Qual a distância de Jerusalém a Belém?',
    'Quantos habitantes tinha a cidade de Roma no século I?',
    'Qual era a moeda usada na província da Judeia sob o domínio romano?',
    'Como era a agricultura e a colheita da cevada na Galileia antiga?',
    'Quem era o imperador romano quando Jesus nasceu?',
  ];

  it('perguntas teológicas com passagem existente no acervo recebem os trechos correspondentes', () => {
    for (const q of teologicasComPassagemNoAcervo) {
      const sources: RagSource[] = [];
      const ctx = builder.getFallbackCommentaryContextWithSources(q, sources);
      const classicSources = sources.filter((s) => s.type === 'classic');

      expect(classicSources.length).toBeGreaterThan(0);
      expect(ctx).toContain('=== COMENTARISTAS CLÁSSICOS (FALLBACK) ===');
    }
  });

  it('perguntas teológicas sem passagem correspondente no acervo estático recebem 0 trechos (evita ruído)', () => {
    for (const q of teologicasSemPassagemNoAcervo) {
      const sources: RagSource[] = [];
      const ctx = builder.getFallbackCommentaryContextWithSources(q, sources);
      const classicSources = sources.filter((s) => s.type === 'classic');

      expect(classicSources).toHaveLength(0);
      expect(ctx).toBe('');
    }
  });

  it('a pergunta sobre Jó não recebe o trecho de Romanos 8:28', () => {
    const sources: RagSource[] = [];
    builder.getFallbackCommentaryContextWithSources(
      'O que significa a soberania de Deus no sofrimento em Jó?',
      sources,
    );
    const hasRomans828 = sources.some((s) => s.reference === 'Romanos 8:28');
    expect(hasRomans828).toBe(false);
    expect(sources).toHaveLength(0);
  });

  it('perguntas não teológicas continuam recebendo 0 trechos', () => {
    for (const q of naoTeologicas) {
      const sources: RagSource[] = [];
      const ctx = builder.getFallbackCommentaryContextWithSources(q, sources);
      const classicSources = sources.filter((s) => s.type === 'classic');

      expect(classicSources).toHaveLength(0);
      expect(ctx).toBe('');
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
