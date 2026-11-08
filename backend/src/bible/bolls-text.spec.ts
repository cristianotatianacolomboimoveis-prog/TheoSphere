import { cleanBollsText } from './bolls-text';

describe('cleanBollsText', () => {
  it('descarta números de Strong da KJV em vez de grudá-los na palavra', () => {
    const raw =
      'For<S>1063</S> God<S>2316</S> so<S>3779</S> loved<S>25</S> the world<S>2889</S>, that<S>5620</S> he gave<S>1325</S>';
    const out = cleanBollsText(raw);
    expect(out).toBe('For God so loved the world, that he gave');
    expect(out).not.toMatch(/\d/);
  });

  it('remove morfologia e marcas de nota com o conteúdo', () => {
    expect(
      cleanBollsText('ἐν<m>PREP</m> ἀρχῇ<sup>a</sup> ἦν <i>ὁ</i> λόγος'),
    ).toBe('ἐν ἀρχῇ ἦν ὁ λόγος');
  });

  it('não altera texto sem marcação', () => {
    const plain = '“How long will you torment me, and crush me with words?';
    expect(cleanBollsText(plain)).toBe(plain);
  });

  it('não junta palavra e pontuação com espaço sobrando', () => {
    expect(cleanBollsText('David<S>1732</S> , when')).toBe('David, when');
  });
});
