import {
  validateAnomalousCounts,
  validateHeadroom,
  SQL_QUERIES,
  ANOMALOUS_EXPECTED_RANGES,
} from './anular-vetores-anomalos.logic';

describe('anular-vetores-anomalos (Regras de Segurança e Validação)', () => {
  describe('validateAnomalousCounts', () => {
    it('total 0 retorna ok com motivo "nada a anular"', () => {
      const counts = { BLIVRE: 0, NVA: 0, TR: 0 };
      const res = validateAnomalousCounts(counts, false);
      expect(res.ok).toBe(true);
      expect(res.reason).toBe('nada a anular');
    });

    it('aprova contagens dentro de todas as faixas esperadas', () => {
      const counts = {
        BLIVRE: 2100, // Faixa [1000, 3500]
        NVA: 590, // Faixa [200, 1200]
        TR: 600, // Faixa [300, 1000]
      };
      const res = validateAnomalousCounts(counts, false);
      expect(res.ok).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it('contagem de BLIVRE abaixo do mínimo rejeita e não anula', () => {
      const counts = {
        BLIVRE: 500, // < 1000
        NVA: 590,
        TR: 600,
      };
      const res = validateAnomalousCounts(counts, false);
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(
        /BLIVRE \(500\) fora da faixa esperada \[1000, 3500\]/,
      );
    });

    it('contagem de BLIVRE acima do máximo rejeita e não anula', () => {
      const counts = {
        BLIVRE: 4000, // > 3500
        NVA: 590,
        TR: 600,
      };
      const res = validateAnomalousCounts(counts, false);
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(
        /BLIVRE \(4000\) fora da faixa esperada \[1000, 3500\]/,
      );
    });

    it('contagem de NVA fora da faixa rejeita e não anula', () => {
      const counts = {
        BLIVRE: 2000,
        NVA: 50, // < 200
        TR: 600,
      };
      const res = validateAnomalousCounts(counts, false);
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(
        /NVA \(50\) fora da faixa esperada \[200, 1200\]/,
      );
    });

    it('contagem de TR fora da faixa rejeita e não anula', () => {
      const counts = {
        BLIVRE: 2000,
        NVA: 500,
        TR: 2500, // > 1000
      };
      const res = validateAnomalousCounts(counts, false);
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(
        /TR \(2500\) fora da faixa esperada \[300, 1000\]/,
      );
    });

    it('permite contagens parciais quando limitado por maxLinhas (modo simulação/teste)', () => {
      const partialCounts = {
        BLIVRE: 236, // Abaixo do mínimo de 1000
        NVA: 0,
        TR: 0,
      };
      const res = validateAnomalousCounts(partialCounts, true);
      expect(res.ok).toBe(true);
    });
  });

  describe('validateHeadroom', () => {
    it('aprova quando a folga é suficiente (headroom >= total + 2000)', () => {
      const totalToAnulate = 3300;
      const headroom = 33800; // 33800 >= 3300 + 2000 (5300)
      const res = validateHeadroom(headroom, totalToAnulate);
      expect(res.ok).toBe(true);
      expect(res.required).toBe(5300);
    });

    it('rejeita quando a folga é insuficiente para anulação mais margem de 2000', () => {
      const totalToAnulate = 3300;
      const headroom = 5000; // 5000 < 5300
      const res = validateHeadroom(headroom, totalToAnulate);
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(
        /Folga de autovacuum insuficiente: disponível=5000 < necessário=5300/,
      );
    });
  });

  describe('SQL de UPDATE de anulação', () => {
    it('o SQL do UPDATE contém estritamente a condição de norma anômala', () => {
      expect(SQL_QUERIES.UPDATE_BATCH).toMatch(
        /vector_norm\(embedding\) NOT BETWEEN 0\.20 AND 0\.85/,
      );
      expect(SQL_QUERIES.UPDATE_BATCH).toMatch(/SET embedding = NULL/);
      expect(SQL_QUERIES.UPDATE_BATCH).toMatch(
        /WHERE id = ANY\(\$1::text\[\]\)/,
      );
    });
  });

  describe('SQL de varredura por tupla única (SCAN_BATCH)', () => {
    it('utiliza a tupla ("bookId", chapter, verse) como cursor de paginação', () => {
      expect(SQL_QUERIES.SCAN_BATCH).toMatch(
        /\("bookId",\s*chapter,\s*verse\)\s*>\s*\(\$2,\s*\$3,\s*\$4\)/,
      );
    });

    it('ordena pela tupla ("bookId", chapter, verse) para alinhamento com a chave única', () => {
      expect(SQL_QUERIES.SCAN_BATCH).toMatch(
        /ORDER BY\s+"bookId",\s*chapter,\s*verse/,
      );
    });

    it('não ordena por id nem usa id como cursor', () => {
      expect(SQL_QUERIES.SCAN_BATCH).not.toMatch(/ORDER BY\s+id/i);
      expect(SQL_QUERIES.SCAN_BATCH).not.toMatch(/id\s*>\s*\$/i);
    });
  });
});
