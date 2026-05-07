import { describe, it, expect } from 'vitest';
import {
  transliterateGreek,
  transliterateHebrew,
  transliterateBiblical,
} from './transliteration';

/**
 * Pure-function smoke tests for the transliteration helpers.
 *
 * Goal: catch regressions when the character maps are edited (the maps are
 * the kind of thing where a single deleted line ships unnoticed). These
 * tests are intentionally narrow — academic transliteration has many
 * acceptable variants and we don't try to be the canon here.
 */
describe('transliterateGreek', () => {
  it('maps lowercase Koine letters to academic latin', () => {
    expect(transliterateGreek('λόγος')).toContain('logos'.charAt(0)); // 'l'
    expect(transliterateGreek('λόγος')).toContain('s');
  });

  it('handles empty input gracefully', () => {
    expect(transliterateGreek('')).toBe('');
  });

  it('passes through non-Greek characters unchanged', () => {
    expect(transliterateGreek('xyz')).toBe('xyz');
  });
});

describe('transliterateHebrew', () => {
  it('maps the Tetragrammaton consonants', () => {
    // יהוה — yod, hey, vav, hey
    const out = transliterateHebrew('יהוה');
    expect(out).toMatch(/y.*h.*w.*h/);
  });

  it('handles empty input gracefully', () => {
    expect(transliterateHebrew('')).toBe('');
  });
});

describe('transliterateBiblical (dispatcher)', () => {
  it('routes NT text through the Greek mapper', () => {
    const out = transliterateBiblical('Ἰησοῦς', true);
    expect(out.length).toBeGreaterThan(0);
    // Greek omicron maps to 'o'
    expect(out).toContain('o');
  });

  it('routes OT text through the Hebrew mapper', () => {
    const out = transliterateBiblical('שלום', false);
    expect(out.length).toBeGreaterThan(0);
  });
});
