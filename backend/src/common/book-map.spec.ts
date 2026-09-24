import {
  BOOK_NAME_TO_ID,
  resolveBookId,
  BOOK_ID_TO_NAME_PT,
  getCanonicalDivision,
} from './book-map';

/**
 * Testes do mapa canônico livro→bookId (extraído na auditoria 2026-07-21).
 * Inclui regressão para o bug em que a cópia do reference-detection não
 * tinha os nomes EN ordinais ("1 corinthians" etc.).
 */
describe('resolveBookId', () => {
  it('resolve nomes PT com e sem acento preservado', () => {
    expect(resolveBookId('Gênesis')).toBe(1);
    expect(resolveBookId('joão')).toBe(43);
    expect(resolveBookId('Apocalipse')).toBe(66);
  });

  it('resolve nomes EN', () => {
    expect(resolveBookId('Genesis')).toBe(1);
    expect(resolveBookId('Revelation')).toBe(66);
    expect(resolveBookId('Psalm')).toBe(19);
  });

  it('REGRESSÃO: ordinais EN resolvem (bug da cópia duplicada)', () => {
    expect(resolveBookId('1 Corinthians')).toBe(46);
    expect(resolveBookId('2 Corinthians')).toBe(47);
    expect(resolveBookId('1 Peter')).toBe(60);
    expect(resolveBookId('1 Kings')).toBe(11);
    expect(resolveBookId('2 Chronicles')).toBe(14);
    expect(resolveBookId('1 Thessalonians')).toBe(52);
    expect(resolveBookId('Jude')).toBe(65);
  });

  it('normaliza caixa e espaços múltiplos', () => {
    expect(resolveBookId('  1   CORINTHIANS ')).toBe(46);
    expect(resolveBookId('MATEUS')).toBe(40);
  });

  it('retorna null para desconhecidos (caller degrada)', () => {
    expect(resolveBookId('Enoque')).toBeNull();
    expect(resolveBookId('')).toBeNull();
  });

  it('todos os 66 livros têm pelo menos um nome mapeado', () => {
    const ids = new Set(Object.values(BOOK_NAME_TO_ID));
    for (let i = 1; i <= 66; i++) {
      expect(ids.has(i)).toBe(true);
    }
  });

  it('nenhum id fora do intervalo 1-66', () => {
    for (const id of Object.values(BOOK_NAME_TO_ID)) {
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(66);
    }
  });

  describe('BOOK_ID_TO_NAME_PT & getCanonicalDivision', () => {
    it('mapeia corretamente todos os 66 livros para seus nomes PT', () => {
      for (let i = 1; i <= 66; i++) {
        expect(BOOK_ID_TO_NAME_PT[i]).toBeDefined();
        expect(typeof BOOK_ID_TO_NAME_PT[i]).toBe('string');
      }
      expect(BOOK_ID_TO_NAME_PT[1]).toBe('Gênesis');
      expect(BOOK_ID_TO_NAME_PT[40]).toBe('Mateus');
      expect(BOOK_ID_TO_NAME_PT[43]).toBe('João');
      expect(BOOK_ID_TO_NAME_PT[66]).toBe('Apocalipse');
    });

    it('classifica corretamente as divisões canônicas universais', () => {
      expect(getCanonicalDivision(1)).toBe('Pentateuco');
      expect(getCanonicalDivision(5)).toBe('Pentateuco');
      expect(getCanonicalDivision(6)).toBe('Históricos (AT)');
      expect(getCanonicalDivision(19)).toBe('Poéticos & Sabedoria');
      expect(getCanonicalDivision(23)).toBe('Profetas Maiores');
      expect(getCanonicalDivision(39)).toBe('Profetas Menores');
      expect(getCanonicalDivision(40)).toBe('Evangelhos');
      expect(getCanonicalDivision(44)).toBe('Atos dos Apóstolos');
      expect(getCanonicalDivision(45)).toBe('Epístolas Paulinas');
      expect(getCanonicalDivision(58)).toBe('Epístolas Gerais');
      expect(getCanonicalDivision(66)).toBe('Apocalipse');
      expect(getCanonicalDivision(999)).toBe('Outro');
    });
  });
});
