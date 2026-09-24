import { computeWordDiff, normalizeToken } from './text-diff';

describe('text-diff (Exegesis Variant Comparison)', () => {
  describe('normalizeToken', () => {
    it('deve converter para minúsculas e remover pontuações comuns', () => {
      expect(normalizeToken('Portanto,')).toBe('portanto');
      expect(normalizeToken('Jesus!')).toBe('jesus');
      expect(normalizeToken('«palavra»')).toBe('palavra');
    });

    it('deve preservar caracteres gregos e hebraicos', () => {
      expect(normalizeToken('λόγος,')).toBe('λογος');
      expect(normalizeToken('בְּרֵאשִׁ֖ית')).toBe('בראשית');
    });
  });

  describe('computeWordDiff', () => {
    it('deve retornar 100% de similaridade para textos idênticos', () => {
      const text = 'No princípio era o Verbo, e o Verbo estava com Deus.';
      const res = computeWordDiff(text, text);

      expect(res.similarity).toBe(100);
      expect(res.addedCount).toBe(0);
      expect(res.removedCount).toBe(0);
      expect(res.equalCount).toBe(text.split(/\s+/).length);
      expect(res.tokens.every((t) => t.type === 'equal')).toBe(true);
    });

    it('deve lidar com textos vazios de forma graciosa', () => {
      const res = computeWordDiff('', '');
      expect(res.similarity).toBe(100);
      expect(res.tokens).toEqual([]);
    });

    it('deve identificar acréscimos e omissões entre duas traduções', () => {
      const base =
        'Portanto agora nenhuma condenação há para os que estão em Cristo Jesus, que não andam segundo a carne, mas sim segundo o Espírito.';
      const target =
        'Agora, pois, já não há nenhuma condenação para os que estão em Cristo Jesus.';

      const res = computeWordDiff(base, target);

      expect(res.similarity).toBeGreaterThan(40);
      expect(res.similarity).toBeLessThan(75);

      const added = res.tokens.filter((t) => t.type === 'added');
      const removed = res.tokens.filter((t) => t.type === 'removed');
      const equal = res.tokens.filter((t) => t.type === 'equal');

      expect(added.length).toBeGreaterThan(0);
      expect(removed.length).toBeGreaterThan(0);
      expect(equal.length).toBeGreaterThan(0);

      // 'Portanto' estava na base e foi omitido no target
      expect(removed.some((t) => t.text.includes('Portanto'))).toBe(true);
      // 'Espírito' estava na base e foi omitido no target
      expect(removed.some((t) => t.text.includes('Espírito'))).toBe(true);
      // 'Cristo' e 'Jesus' estão presentes em ambos
      expect(equal.some((t) => t.text.includes('Cristo'))).toBe(true);
    });

    it('deve comparar textos em inglês (KJV vs WEB)', () => {
      const kjv =
        'For God so loved the world, that he gave his only begotten Son';
      const web =
        'For God so loved the world, that he gave his one and only Son';

      const res = computeWordDiff(kjv, web);

      expect(res.similarity).toBeGreaterThan(80);
      const added = res.tokens.filter((t) => t.type === 'added');
      const removed = res.tokens.filter((t) => t.type === 'removed');

      expect(removed.some((t) => t.text === 'begotten')).toBe(true);
      expect(added.some((t) => t.text === 'one')).toBe(true);
      expect(added.some((t) => t.text === 'and')).toBe(true);
    });
  });
});
