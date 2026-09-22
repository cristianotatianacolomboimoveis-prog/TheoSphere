/**
 * LruCache — In-memory Least-Recently-Used (LRU) Cache com suporte a TTL.
 *
 * Utiliza a garantia da especificação ECMAScript de que `Map.prototype.keys()`
 * itera na ordem de inserção. A cada get/set, o item é re-inserido no final
 * para mantê-lo como Most Recently Used. O item mais antigo (primeira chave)
 * é descartado em O(1) quando o limite `maxSize` é atingido.
 */
export interface LruCacheOptions {
  maxSize: number;
  ttlMs?: number;
}

interface CacheEntry<V> {
  value: V;
  expiresAt?: number;
}

export class LruCache<K, V> {
  private readonly items = new Map<K, CacheEntry<V>>();
  private readonly maxSize: number;
  private readonly ttlMs?: number;

  private hits = 0;
  private misses = 0;

  constructor(options: LruCacheOptions) {
    if (options.maxSize <= 0) {
      throw new Error('maxSize must be greater than 0');
    }
    this.maxSize = options.maxSize;
    this.ttlMs = options.ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.items.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.items.delete(key);
      this.misses++;
      return undefined;
    }

    // Refresh MRU position (delete & re-insert)
    this.items.delete(key);
    this.items.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: K, value: V, customTtlMs?: number): this {
    if (this.items.has(key)) {
      this.items.delete(key);
    } else if (this.items.size >= this.maxSize) {
      // Evict oldest (first inserted key)
      const oldestKey = this.items.keys().next().value;
      if (oldestKey !== undefined) {
        this.items.delete(oldestKey);
      }
    }

    const ttl = customTtlMs ?? this.ttlMs;
    const expiresAt = ttl !== undefined ? Date.now() + ttl : undefined;

    this.items.set(key, { value, expiresAt });
    return this;
  }

  has(key: K): boolean {
    const entry = this.items.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.items.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    return this.items.delete(key);
  }

  clear(): void {
    this.items.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.items.size;
  }

  get stats() {
    const total = this.hits + this.misses;
    return {
      size: this.items.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? this.hits / total : 0,
    };
  }
}
