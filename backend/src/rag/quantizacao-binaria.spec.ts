describe('medir-quantizacao-binaria (unit math checks)', () => {
  function popcount32(x: number): number {
    x -= (x >>> 1) & 0x55555555;
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    x = (x + (x >>> 4)) & 0x0f0f0f0f;
    x += x >>> 8;
    x += x >>> 16;
    return x & 0x3f;
  }

  function hammingDistance768(a: Uint32Array, b: Uint32Array): number {
    let dist = 0;
    for (let i = 0; i < 24; i++) {
      dist += popcount32(a[i] ^ b[i]);
    }
    return dist;
  }

  function quantizeBinary(vec: Float32Array): Uint32Array {
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

  it('popcount32 calcula o número de bits 1 corretamente', () => {
    expect(popcount32(0)).toBe(0);
    expect(popcount32(1)).toBe(1);
    expect(popcount32(0b101010)).toBe(3);
    expect(popcount32(0xffffffff)).toBe(32);
  });

  it('quantizeBinary gera 1 apenas para valores estritamente positivos', () => {
    const vec = new Float32Array(768);
    vec[0] = 0.5;
    vec[1] = -0.5;
    vec[2] = 0.0;
    vec[31] = 1.0;
    vec[32] = 0.2;

    const bin = quantizeBinary(vec);
    expect((bin[0] & 1) !== 0).toBe(true); // bit 0 = 1
    expect((bin[0] & 2) !== 0).toBe(false); // bit 1 = 0 (negativo)
    expect((bin[0] & 4) !== 0).toBe(false); // bit 2 = 0 (zero)
    expect((bin[0] & (1 << 31)) !== 0).toBe(true); // bit 31 = 1
    expect((bin[1] & 1) !== 0).toBe(true); // word 1, bit 0 = 1
  });

  it('hammingDistance768 retorna a quantidade exata de bits divergentes', () => {
    const a = new Uint32Array(24);
    const b = new Uint32Array(24);
    a[0] = 0b1111;
    b[0] = 0b1001; // difere em 2 bits
    expect(hammingDistance768(a, b)).toBe(2);

    a[1] = 0b0101;
    b[1] = 0b1010; // difere em 4 bits
    expect(hammingDistance768(a, b)).toBe(6);
  });
});
