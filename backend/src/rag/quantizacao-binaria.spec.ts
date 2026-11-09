import {
  popcount32,
  hammingDistance768,
  quantizeBinary,
  cosineSimilarity768,
  mulberry32,
} from './binary-quantization';

describe('binary-quantization module', () => {
  describe('popcount32', () => {
    it('calcula o número de bits 1 corretamente para diversos padrões', () => {
      expect(popcount32(0)).toBe(0);
      expect(popcount32(1)).toBe(1);
      expect(popcount32(0b101010)).toBe(3);
      expect(popcount32(0x7fffffff)).toBe(31);
      expect(popcount32(0xffffffff)).toBe(32);
    });
  });

  describe('quantizeBinary', () => {
    it('gera 1 apenas para valores estritamente positivos (> 0)', () => {
      const vec = new Float32Array(768);
      vec[0] = 0.5;
      vec[1] = -0.5;
      vec[2] = 0.0;
      vec[3] = -0.0;
      vec[4] = 0.000001;

      const bin = quantizeBinary(vec);
      expect((bin[0] & 1) !== 0).toBe(true); // bit 0 = 1
      expect((bin[0] & 2) !== 0).toBe(false); // bit 1 = 0 (negativo)
      expect((bin[0] & 4) !== 0).toBe(false); // bit 2 = 0 (zero exato)
      expect((bin[0] & 8) !== 0).toBe(false); // bit 3 = 0 (-0.0)
      expect((bin[0] & 16) !== 0).toBe(true); // bit 4 = 1 (> 0)
    });

    it('trata corretamente o bit 31 (que possui representação negativa em signed int32 no JS)', () => {
      const vec = new Float32Array(768);
      // Bit 31 pertence à word 0 (índice 31)
      vec[31] = 0.8;
      // Bit 31 da word 1 (índice 63: 1 * 32 + 31)
      vec[63] = 0.3;
      // Bit 31 da última word 23 (índice 767: 23 * 32 + 31)
      vec[767] = 0.99;

      const bin = quantizeBinary(vec);

      // Verificação do bit mais significativo (bit 31) via unsigned shift e máscara
      expect((bin[0] >>> 31) & 1).toBe(1);
      expect(bin[0] & 0x80000000).not.toBe(0);

      expect((bin[1] >>> 31) & 1).toBe(1);
      expect(bin[1] & 0x80000000).not.toBe(0);

      expect((bin[23] >>> 31) & 1).toBe(1);
      expect(bin[23] & 0x80000000).not.toBe(0);

      // As outras words não devem ter o bit 31 ligado
      expect((bin[2] >>> 31) & 1).toBe(0);
      expect(bin[2] & 0x80000000).toBe(0);
    });

    it('aloca bits nas words corretas em múltiplos de 32', () => {
      const vec = new Float32Array(768);
      vec[32] = 1.0; // word 1, bit 0
      vec[64] = 1.0; // word 2, bit 0
      vec[736] = 1.0; // word 23, bit 0

      const bin = quantizeBinary(vec);
      expect(bin[0]).toBe(0);
      expect(bin[1] & 1).toBe(1);
      expect(bin[2] & 1).toBe(1);
      expect(bin[23] & 1).toBe(1);
    });
  });

  describe('hammingDistance768', () => {
    it('retorna a quantidade exata de bits divergentes', () => {
      const a = new Uint32Array(24);
      const b = new Uint32Array(24);
      a[0] = 0b1111;
      b[0] = 0b1001; // difere em 2 bits
      expect(hammingDistance768(a, b)).toBe(2);

      a[1] = 0b0101;
      b[1] = 0b1010; // difere em 4 bits
      expect(hammingDistance768(a, b)).toBe(6);

      // Teste com bit 31
      a[23] = 0x80000000;
      b[23] = 0x00000000;
      expect(hammingDistance768(a, b)).toBe(7);
    });
  });

  describe('cosineSimilarity768', () => {
    it('calcula similaridade de cosseno com precisão unitária', () => {
      const a = new Float32Array(768);
      const b = new Float32Array(768);
      a[0] = 1.0;
      b[0] = 1.0;
      expect(cosineSimilarity768(a, b)).toBeCloseTo(1.0, 5);

      b[0] = -1.0;
      expect(cosineSimilarity768(a, b)).toBeCloseTo(-1.0, 5);

      b[0] = 0.0;
      b[1] = 1.0;
      expect(cosineSimilarity768(a, b)).toBeCloseTo(0.0, 5);
    });
  });

  describe('mulberry32', () => {
    it('gera sequências determinísticas a partir da mesma semente', () => {
      const rng1 = mulberry32(20261109);
      const rng2 = mulberry32(20261109);
      for (let i = 0; i < 10; i++) {
        expect(rng1()).toBe(rng2());
      }
    });
  });
});
