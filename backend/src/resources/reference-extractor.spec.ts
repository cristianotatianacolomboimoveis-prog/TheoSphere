import {
  extractStructuredReferences,
  inferBookIdFromWorkTitle,
  parseRomanNumeral,
  splitIntoStructuralChunks,
} from './reference-extractor';

describe('ReferenceExtractor (T1.4)', () => {
  describe('parseRomanNumeral', () => {
    it('converte numerais romanos válidos de I a CL (1 a 150)', () => {
      expect(parseRomanNumeral('i')).toBe(1);
      expect(parseRomanNumeral('iii')).toBe(3);
      expect(parseRomanNumeral('ix')).toBe(9);
      expect(parseRomanNumeral('xlv')).toBe(45);
      expect(parseRomanNumeral('cxix')).toBe(119);
      expect(parseRomanNumeral('cl')).toBe(150);
    });

    it('rejeita strings inválidas ou fora de 1..150', () => {
      expect(parseRomanNumeral('')).toBeNull();
      expect(parseRomanNumeral('iiii')).toBeNull();
      expect(parseRomanNumeral('abc')).toBeNull();
    });
  });

  describe('Regras de desambiguação e bloqueio de falsos positivos', () => {
    it('mapeia "Jn" para João (43) e nunca para Jonas (32)', () => {
      const { references } = extractStructuredReferences(
        'Compare Jn 3:16 and Jn. 1:14 in the Fourth Gospel.',
      );
      expect(references).toHaveLength(2);
      expect(references[0].canonicalRef).toBe(43003016);
      expect(references[1].canonicalRef).toBe(43001014);
    });

    it('rejeita "jn_nt" como abreviação inexistente', () => {
      const { references } = extractStructuredReferences(
        'Invalid token jn_nt 3:16 or JN_NT 3:16 should not match.',
      );
      expect(references).toEqual([]);
    });

    it('bloqueia falsos positivos nas 11 palavras comuns (is, at, am, ex, ne, os, ed, et, na, ag, cl)', () => {
      const trapText = [
        'We arrived at 5:30 and left at 6:15.',
        'The ratio is 3:16 in that experiment, or am 2:4 in the log.',
        'Lowercase tokens ex 20:1, ne 8:10, os 6:3, ed 7:10, et 4:14, na 1:7, ag 2:9, cl 3:1 must fail.',
        'At 5:30 the meeting started. Is 3:16 a good score? Am 2:4 is not a verse.',
      ].join(' ');

      const { references } = extractStructuredReferences(trapText);
      expect(references).toEqual([]);
    });

    it('aceita as abreviações curtas quando pontuadas ("Is. 53:5", "Ex. 20:1") ou entre parênteses "(At 2:38)"', () => {
      const validText =
        'Como escrito em Is. 53:5, Ex. 20:1-3 e (At 2:38), bem como Cl. 3:1.';
      const { references } = extractStructuredReferences(validText);
      expect(references.map((r) => [r.startRef, r.endRef])).toEqual([
        [23053005, 23053005],
        [2020001, 2020003],
        [44002038, 44002038],
        [51003001, 51003001],
      ]);
    });
  });

  describe('Intervalos, numerais romanos e resolução por cabeçalho corrente', () => {
    it('extrai intervalos PT e EN ("Jo 3:16-18", "1 Cor. 13:4-7") com startRef e endRef', () => {
      const { references } = extractStructuredReferences(
        'Veja Jo 3:16-18 e 1 Cor. 13:4-7 na exposição.',
      );
      expect(references).toHaveLength(2);
      expect(references[0]).toMatchObject({
        canonicalRef: 43003016,
        startRef: 43003016,
        endRef: 43003018,
        kind: 'inline',
      });
      expect(references[1]).toMatchObject({
        canonicalRef: 46013004,
        startRef: 46013004,
        endRef: 46013007,
        kind: 'inline',
      });
    });

    it('extrai capítulos em numerais romanos e continuações por ponto-e-vírgula (Matthew Henry)', () => {
      const { references } = extractStructuredReferences(
        'Compare Job ix. 15, Ps. cxix. 130, and Ps. civ. 13; lxv. 9, 10.',
      );
      expect(references.map((r) => [r.startRef, r.endRef])).toEqual([
        [18009015, 18009015],
        [19119130, 19119130],
        [19104013, 19104013],
        [19065009, 19065010],
      ]);
    });

    it('resolve "v. 16", "v. 14-18" e "ch. vii. 50" a partir do cabeçalho corrente', () => {
      const { references, updatedContext } = extractStructuredReferences(
        '__________________________________________________________________ J O H N. CHAP. III. Here Christ discourses of his design, v. 14-18, and especially God so loved the world (v. 16), as Nicodemus later remembered in ch. vii. 50.',
      );

      expect(updatedContext.bookId).toBe(43);
      expect(updatedContext.chapter).toBe(3);

      expect(references).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            startRef: 43003014,
            endRef: 43003018,
            kind: 'heading',
          }),
          expect.objectContaining({
            startRef: 43003016,
            endRef: 43003016,
            kind: 'inline',
          }),
          expect.objectContaining({
            startRef: 43007050,
            endRef: 43007050,
            kind: 'inline',
          }),
        ]),
      );
    });
  });

  describe('splitIntoStructuralChunks', () => {
    it('corta por cabeçalhos e propaga o intervalo "Verses 16-18" como kind: "heading"', () => {
      const doc = [
        'CHAPTER 3\nVerses 1-5\nNicodemus came to Jesus by night (v. 2).',
        'Verses 16-18\nFor God so loved the world (v. 16) that he gave his only-begotten Son.',
      ].join('\n');

      const chunks = splitIntoStructuralChunks(doc, {
        initialContext: { bookId: 43 },
      });

      expect(chunks).toHaveLength(2);
      expect(chunks[0].startRef).toBe(43003001);
      expect(chunks[0].endRef).toBe(43003005);

      expect(chunks[1].startRef).toBe(43003016);
      expect(chunks[1].endRef).toBe(43003018);
      expect(chunks[1].references).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            startRef: 43003016,
            endRef: 43003018,
            kind: 'heading',
          }),
          expect.objectContaining({
            startRef: 43003016,
            endRef: 43003016,
            kind: 'inline',
          }),
        ]),
      );
    });

    it('aplica janela deslizante com sobreposição quando não há cabeçalhos e o texto excede windowWords', () => {
      const words = Array.from({ length: 120 }, (_, i) => `word${i + 1}`).join(
        ' ',
      );
      const chunks = splitIntoStructuralChunks(`${words} (John 3:16)`, {
        windowWords: 50,
        overlapWords: 10,
      });
      expect(chunks.length).toBeGreaterThanOrEqual(3);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.references[0]).toMatchObject({
        startRef: 43003016,
        endRef: 43003016,
      });
    });
  });

  describe('inferBookIdFromWorkTitle', () => {
    it('infere o bookId para comentários de livro único e retorna undefined para obras gerais', () => {
      expect(inferBookIdFromWorkTitle('Gospel According to John Vol 1')).toBe(
        43,
      );
      expect(inferBookIdFromWorkTitle('Commentary on Romans')).toBe(45);
      expect(
        inferBookIdFromWorkTitle('Commentary on the Book of Psalms Vol 2'),
      ).toBe(19);
      expect(
        inferBookIdFromWorkTitle('Commentary on the Whole Bible Vol 5'),
      ).toBeUndefined();
    });
  });
});
