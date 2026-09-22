import { LruCache } from './lru-cache';

describe('LruCache', () => {
  it('armazena e recupera valores', () => {
    const cache = new LruCache<string, number>({ maxSize: 3 });
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBeUndefined();
  });

  it('descarta o item menos recentemente usado quando atinge maxSize', () => {
    const cache = new LruCache<string, number>({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    // Leitura de 'a' atualiza sua posição para mais recente
    cache.get('a');

    // Inserção de 'c' deve descartar 'b' (mais antigo não acessado)
    cache.set('c', 3);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('expira itens após o TTL configurado', async () => {
    const cache = new LruCache<string, string>({ maxSize: 10, ttlMs: 20 });
    cache.set('k1', 'val1');

    expect(cache.get('k1')).toBe('val1');

    // Aguarda expiração do TTL
    await new Promise((r) => setTimeout(r, 25));

    expect(cache.get('k1')).toBeUndefined();
    expect(cache.has('k1')).toBe(false);
  });

  it('calcula estatísticas de hits e misses', () => {
    const cache = new LruCache<string, number>({ maxSize: 5 });
    cache.set('x', 10);

    cache.get('x'); // hit
    cache.get('x'); // hit
    cache.get('y'); // miss

    const stats = cache.stats;
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRatio).toBeCloseTo(2 / 3);
  });

  it('limpa todos os itens e reseta stats', () => {
    const cache = new LruCache<string, number>({ maxSize: 5 });
    cache.set('x', 1);
    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.stats.hits).toBe(0);
  });
});
