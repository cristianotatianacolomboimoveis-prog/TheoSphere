import {
  toCanonicalRef,
  fromCanonicalRef,
  parseRefToCanonical,
  formatCanonicalRef,
  getChapterRange,
  getBookRange,
  isRefInRange,
} from './canonical-ref';

describe('canonical-ref (T1.3)', () => {
  describe('toCanonicalRef', () => {
    it('deve codificar bookId, chapter e verse no formato BBCCCVVV', () => {
      expect(toCanonicalRef(1, 1, 1)).toBe(1001001); // Gênesis 1:1
      expect(toCanonicalRef(43, 3, 16)).toBe(43003016); // João 3:16
      expect(toCanonicalRef(66, 22, 21)).toBe(66022021); // Apocalipse 22:21
      expect(toCanonicalRef(19, 119, 105)).toBe(19119105); // Salmo 119:105
    });

    it('deve lançar erro se componentes não forem inteiros', () => {
      expect(() => toCanonicalRef(1.5, 1, 1)).toThrow('inteiros válidos');
      expect(() => toCanonicalRef(1, 1.2, 1)).toThrow('inteiros válidos');
      expect(() => toCanonicalRef(1, 1, NaN)).toThrow('inteiros válidos');
    });

    it('deve lançar erro se bookId for fora dos limites', () => {
      expect(() => toCanonicalRef(0, 1, 1)).toThrow('fora do cânon');
      expect(() => toCanonicalRef(83, 1, 1)).toThrow('fora do cânon');
    });
  });

  describe('fromCanonicalRef', () => {
    it('deve decodificar inteiro BBCCCVVV para objeto { bookId, chapter, verse }', () => {
      expect(fromCanonicalRef(1001001)).toEqual({
        bookId: 1,
        chapter: 1,
        verse: 1,
      });
      expect(fromCanonicalRef(43003016)).toEqual({
        bookId: 43,
        chapter: 3,
        verse: 16,
      });
      expect(fromCanonicalRef(66022021)).toEqual({
        bookId: 66,
        chapter: 22,
        verse: 21,
      });
      expect(fromCanonicalRef(19119105)).toEqual({
        bookId: 19,
        chapter: 119,
        verse: 105,
      });
    });

    it('deve lançar erro para referências inválidas', () => {
      expect(() => fromCanonicalRef(-1)).toThrow('inválida');
      expect(() => fromCanonicalRef(0)).toThrow('inválida');
      expect(() => fromCanonicalRef(1.234)).toThrow('inválida');
    });
  });

  describe('parseRefToCanonical', () => {
    it('deve converter referências em inglês para formato numérico', () => {
      expect(parseRefToCanonical('Genesis 1:1')).toBe(1001001);
      expect(parseRefToCanonical('John 3:16')).toBe(43003016);
      expect(parseRefToCanonical('1 John 4:9')).toBe(62004009);
      expect(parseRefToCanonical('Rev 22:21')).toBe(66022021);
    });

    it('deve converter referências em português para formato numérico', () => {
      expect(parseRefToCanonical('Gênesis 1:1')).toBe(1001001);
      expect(parseRefToCanonical('Gn 1:1')).toBe(1001001);
      expect(parseRefToCanonical('João 3:16')).toBe(43003016);
      expect(parseRefToCanonical('1 João 4:9')).toBe(62004009);
      expect(parseRefToCanonical('1Jo 4:9')).toBe(62004009);
      expect(parseRefToCanonical('Salmos 119:105')).toBe(19119105);
      expect(parseRefToCanonical('Sl 23:1')).toBe(19023001);
    });

    it('deve lidar com separador de ponto em vez de dois pontos', () => {
      expect(parseRefToCanonical('John 3.16')).toBe(43003016);
      expect(parseRefToCanonical('Mt 28.19')).toBe(40028019);
    });

    it('deve retornar null para strings inválidas ou desconhecidas', () => {
      expect(parseRefToCanonical('')).toBeNull();
      expect(parseRefToCanonical('Texto Aleatório 1:1')).toBeNull();
      expect(parseRefToCanonical('João')).toBeNull();
      expect(parseRefToCanonical('3:16')).toBeNull();
      expect(parseRefToCanonical(null as any)).toBeNull();
    });
  });

  describe('formatCanonicalRef', () => {
    it('deve formatar número para string legível em português', () => {
      expect(formatCanonicalRef(1001001, 'pt')).toBe('Gênesis 1:1');
      expect(formatCanonicalRef(43003016, 'pt')).toBe('João 3:16');
      expect(formatCanonicalRef(19023001, 'pt')).toBe('Salmos 23:1');
    });

    it('deve formatar número para string legível em inglês', () => {
      expect(formatCanonicalRef(43003016, 'en')).toBe('John 3:16');
    });
  });

  describe('getChapterRange and getBookRange', () => {
    it('deve retornar intervalo para o capítulo inteiro', () => {
      const range = getChapterRange(43, 3);
      expect(range.startRef).toBe(43003001);
      expect(range.endRef).toBe(43003999);
    });

    it('deve retornar intervalo para o livro inteiro', () => {
      const range = getBookRange(1);
      expect(range.startRef).toBe(1001001);
      expect(range.endRef).toBe(1999999);
    });
  });

  describe('isRefInRange', () => {
    it('deve validar se referência está no intervalo', () => {
      const range = getChapterRange(43, 3);
      expect(isRefInRange(43003016, range.startRef, range.endRef)).toBe(true);
      expect(isRefInRange(43003001, range.startRef, range.endRef)).toBe(true);
      expect(isRefInRange(43004001, range.startRef, range.endRef)).toBe(false);
      expect(isRefInRange(42003016, range.startRef, range.endRef)).toBe(false);
    });
  });
});
