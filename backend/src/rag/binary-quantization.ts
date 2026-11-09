/**
 * Funções utilitárias e matemáticas de quantização binária e distâncias
 * para busca vetorial compacta no Supabase Nano (768 dimensões).
 */

// PRNG determinístico Mulberry32
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Popcount de 32 bits (contagem de bits 1 em um inteiro de 32 bits)
export function popcount32(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  x += x >>> 8;
  x += x >>> 16;
  return x & 0x3f;
}

// Distância de Hamming para 24 words de 32 bits (768 bits no total)
export function hammingDistance768(a: Uint32Array, b: Uint32Array): number {
  let dist = 0;
  for (let i = 0; i < 24; i++) {
    dist += popcount32(a[i] ^ b[i]);
  }
  return dist;
}

// Similaridade de Cosseno entre dois vetores de 768 dimensões (Float32Array)
export function cosineSimilarity768(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < 768; i++) {
    const ai = a[i];
    const bi = b[i];
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// Binariza Float32Array de 768 elementos para Uint32Array(24) usando o sinal (> 0 => 1)
// Compatível com o comportamento de `binary_quantize(v)` do pgvector
export function quantizeBinary(vec: Float32Array): Uint32Array {
  const binary = new Uint32Array(24);
  for (let i = 0; i < 768; i++) {
    if (vec[i] > 0) {
      const wordIdx = Math.floor(i / 32);
      const bitIdx = i % 32;
      binary[wordIdx] |= 1 << bitIdx;
    }
  }
  return binary;
}
