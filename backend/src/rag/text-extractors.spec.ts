import { cleanExtractedText } from './text-extractors';

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
