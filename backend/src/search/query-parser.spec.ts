import { parseAdvancedQuery, toTsQuery } from './query-parser';

/**
 * Testes do parser da busca avançada (sintaxe estilo Logos/Accordance).
 * Funções puras — sem mocks. Cobrem: termos livres, frases, filtros de
 * campo (book/chapter/lemma), os novos strong:/morph: (auditoria
 * 2026-07-21), exclusões, grupos OR e a geração de tsquery.
 */
describe('parseAdvancedQuery', () => {
  it('trata query vazia/inválida sem lançar', () => {
    expect(parseAdvancedQuery('').must).toEqual([]);
    expect(parseAdvancedQuery('   ').hasStructure).toBe(false);
    expect(parseAdvancedQuery(undefined as unknown as string).must).toEqual([]);
  });

  it('termos livres viram must AND-joined', () => {
    const p = parseAdvancedQuery('graça fé');
    expect(p.must).toEqual(['graça', 'fé']);
    expect(p.hasStructure).toBe(false);
    expect(p.plain).toBe('graça fé');
  });

  it('extrai frases entre aspas', () => {
    const p = parseAdvancedQuery('"no princípio" Deus');
    expect(p.phrases).toEqual(['no princípio']);
    expect(p.must).toEqual(['Deus']);
  });

  it('book: e chapter: com range marcam hasStructure', () => {
    const p = parseAdvancedQuery('book:John chapter:1-3 grace');
    expect(p.bookName).toBe('John');
    expect(p.chapterMin).toBe(1);
    expect(p.chapterMax).toBe(3);
    expect(p.hasStructure).toBe(true);
    expect(p.must).toEqual(['grace']);
  });

  it('book: com + vira nome multi-palavra', () => {
    const p = parseAdvancedQuery('book:1+Corinthians love');
    expect(p.bookName).toBe('1 Corinthians');
  });

  it('chapter: invertido (5-3) é ignorado', () => {
    const p = parseAdvancedQuery('chapter:5-3 fé');
    expect(p.chapterMin).toBeUndefined();
    expect(p.hasStructure).toBe(false);
  });

  it('exclusão -termo vai para mustNot', () => {
    const p = parseAdvancedQuery('repent -hell');
    expect(p.must).toEqual(['repent']);
    expect(p.mustNot).toEqual(['hell']);
    expect(p.hasStructure).toBe(true);
  });

  it('grupos OR agrupam esquerda e direita', () => {
    const p = parseAdvancedQuery('grace OR mercy');
    expect(p.shouldGroups).toEqual([['grace', 'mercy']]);
    expect(p.must).toEqual([]);
  });

  describe('strong: (via InterlinearWord)', () => {
    it('normaliza minúsculas para o padrão canônico', () => {
      const p = parseAdvancedQuery('strong:g26');
      expect(p.strongId).toBe('G26');
      expect(p.hasStructure).toBe(true);
    });

    it('aceita hebraico e sufixo de letra do padrão STEP', () => {
      expect(parseAdvancedQuery('strong:H3068').strongId).toBe('H3068');
      expect(parseAdvancedQuery('strong:G5921a').strongId).toBe('G5921A');
    });

    it('malformado degrada para termo livre (parser permissivo)', () => {
      const p = parseAdvancedQuery('strong:xyz');
      expect(p.strongId).toBeUndefined();
      expect(p.must).toContain('xyz');
    });

    it('combina com book: e termos livres', () => {
      const p = parseAdvancedQuery('strong:G26 book:John amor');
      expect(p.strongId).toBe('G26');
      expect(p.bookName).toBe('John');
      expect(p.must).toEqual(['amor']);
    });
  });

  describe('morph: (via InterlinearWord)', () => {
    it('normaliza e mantém apenas [A-Z0-9-]', () => {
      const p = parseAdvancedQuery('morph:v-aai');
      expect(p.morph).toBe('V-AAI');
      expect(p.hasStructure).toBe(true);
    });

    it('remove caracteres perigosos (defesa para o LIKE)', () => {
      expect(parseAdvancedQuery("morph:V%';--").morph).toBe('V--');
    });

    it('vazio após sanitização não seta o filtro', () => {
      const p = parseAdvancedQuery('morph:%%% fé');
      expect(p.morph).toBeUndefined();
    });
  });

  describe('lemma: (via InterlinearWord)', () => {
    it('captura o lema em grafia original', () => {
      const p = parseAdvancedQuery('lemma:ἀγαπάω book:John');
      expect(p.lemma).toBe('ἀγαπάω');
      expect(p.hasStructure).toBe(true);
      expect(p.must).toEqual([]);
    });
  });

  describe('NEAR/n (proximidade)', () => {
    it('captura par com distância', () => {
      const p = parseAdvancedQuery('graça NEAR/3 fé');
      expect(p.nearPairs).toEqual([['graça', 'fé', 3]]);
      expect(p.hasStructure).toBe(true);
      expect(p.must).toEqual([]);
      expect(p.plain).toContain('graça');
      expect(p.plain).toContain('fé');
    });

    it('NEAR sem termo à esquerda degrada para termo livre', () => {
      const p = parseAdvancedQuery('NEAR/3 fé');
      expect(p.nearPairs).toBeUndefined();
      expect(p.must).toContain('NEAR/3');
    });
  });

  it('campo desconhecido vira termo livre', () => {
    const p = parseAdvancedQuery('autor:Paulo graça');
    expect(p.must).toContain('autor:Paulo');
  });
});

describe('toTsQuery', () => {
  it('retorna null sem termos (só filtros)', () => {
    expect(toTsQuery(parseAdvancedQuery('book:John'))).toBeNull();
    expect(toTsQuery(parseAdvancedQuery('strong:G26'))).toBeNull();
  });

  it('frases usam proximidade <->', () => {
    const q = toTsQuery(parseAdvancedQuery('"in the beginning"'));
    expect(q).toBe('(in <-> the <-> beginning)');
  });

  it('grupos OR usam | e exclusões usam !', () => {
    const q = toTsQuery(parseAdvancedQuery('grace OR mercy -hell'));
    expect(q).toContain('(grace | mercy)');
    expect(q).toContain('!hell');
  });

  it('remove caracteres especiais de tsquery (injeção de operador)', () => {
    const q = toTsQuery(parseAdvancedQuery("faith&|!<>'()"));
    expect(q).toBe('faith');
  });

  it('NEAR/2 gera alternativas <1>..<2> nas duas direções', () => {
    const q = toTsQuery(parseAdvancedQuery('graça NEAR/2 fé'));
    expect(q).toContain('graça <1> fé');
    expect(q).toContain('fé <1> graça');
    expect(q).toContain('graça <2> fé');
    expect(q).toContain('fé <2> graça');
  });

  it('lemma: sozinho não gera tsquery (filtro é via EXISTS)', () => {
    expect(toTsQuery(parseAdvancedQuery('lemma:ἀγαπάω'))).toBeNull();
  });
});
