import { cleanExtractedText, pdfPageCount } from './text-extractors';

/**
 * O campo de contagem de páginas mudou de nome entre as versões do pdf-parse
 * (v1 `numpages` → v2 `total`) e ninguém reparou: ler o campo antigo devolve
 * undefined sem erro. Como esse número alimenta o guarda de PDF escaneado da
 * análise de qualidade, o guarda ficou desligado e uma obra escaneada entrou
 * no acervo com nota 97. Estes testes prendem as duas formas.
 */
describe('pdfPageCount', () => {
  it('lê o campo da v2 (TextResult.total)', () => {
    expect(pdfPageCount({ total: 284, pages: [], text: '' })).toBe(284);
  });

  it('lê o campo da v1 (numpages)', () => {
    expect(pdfPageCount({ numpages: 212, text: '' })).toBe(212);
  });

  it('cai no tamanho do array de páginas quando não há contagem', () => {
    expect(pdfPageCount({ pages: [{ num: 1 }, { num: 2 }] })).toBe(2);
  });

  it('devolve undefined quando a informação não veio', () => {
    // Precisa ser undefined, e não 0: o chamador tem de saber distinguir
    // "não sei quantas páginas" de "sei que tem zero" — foi confundir os dois
    // que deixou o guarda de OCR passar em silêncio.
    expect(pdfPageCount({ text: 'só o texto' })).toBeUndefined();
    expect(pdfPageCount(undefined)).toBeUndefined();
    expect(pdfPageCount({ total: NaN })).toBeUndefined();
  });
});

/**
 * Estes testes existem por causa de um caso real: onze obras boas (Owen,
 * Schaeffer, Piper, Hodge) foram reprovadas na análise de qualidade porque as
 * passagens sorteadas caíam em blocos de "-- 75 of 212 --" e o revisor as
 * julgou ilegíveis. A limpeza precisa remover o artefato sem estragar o texto.
 */
describe('cleanExtractedText', () => {
  it('remove marcas de paginação do pdf-parse', () => {
    const sujo = 'conforme ensina -- 75 of 212 -- o apóstolo Paulo';
    expect(cleanExtractedText(sujo)).toBe('conforme ensina o apóstolo Paulo');
  });

  it('remove marcas no formato "Page N of M"', () => {
    expect(cleanExtractedText('texto Page 12 of 400 segue')).toBe(
      'texto segue',
    );
  });

  it('junta palavras partidas pela hifenização de fim de linha', () => {
    expect(cleanExtractedText('a justi- ficação pela fé')).toBe(
      'a justificação pela fé',
    );
  });

  it('junta hifenização em palavras acentuadas', () => {
    // \w não cobre acentos — foi por isso que a limpeza usa \p{L}.
    expect(cleanExtractedText('a ressurrei- ção do Senhor')).toBe(
      'a ressurreição do Senhor',
    );
  });

  it('preserva hífens legítimos de palavras compostas', () => {
    const texto = 'o porta-voz recém-nascido do além-mar';
    expect(cleanExtractedText(texto)).toBe(texto);
  });

  it('preserva as quebras de parágrafo de que o chunking depende', () => {
    const texto = 'Primeiro parágrafo.\n\nSegundo parágrafo.';
    expect(cleanExtractedText(texto)).toBe(texto);
  });

  it('não altera texto já limpo', () => {
    const texto = 'A fé vem pelo ouvir, e o ouvir pela palavra de Deus.';
    expect(cleanExtractedText(texto)).toBe(texto);
  });

  it('esvazia um PDF cuja camada de texto só tem paginação', () => {
    // É exatamente o que a extração devolve de um PDF escaneado: o OCR pegou
    // os números de página e nada mais. Precisa sobrar vazio para o chamador
    // detectar que não há o que indexar.
    const escaneado = '-- 1 of 284 -- -- 2 of 284 -- -- 3 of 284 --';
    expect(cleanExtractedText(escaneado).trim()).toBe('');
  });
});
