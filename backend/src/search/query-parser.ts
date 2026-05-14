/**
 * Query parser for the advanced search syntax.
 *
 * Supported syntax (modeled after Logos / Accordance "speed search"):
 *
 *   • Free terms — words & quoted phrases, combined with AND/OR.
 *       agape AND eros
 *       "in the beginning"
 *       grace OR mercy
 *
 *   • Field filters — `field:value`. Multiple values via repetition.
 *       book:John
 *       book:1+Corinthians          (use + for multi-word books in URL form)
 *       chapter:3
 *       chapter:3-5                  (inclusive range)
 *       lemma:λόγος                  (treated as a literal-only term)
 *
 *   • Exclusions:
 *       repent -hell                 (must contain repent, must not contain hell)
 *
 * Out of scope for now (intentional — data not in schema):
 *   • strong:G26 — requires per-word Strong's mapping on every verse
 *   • morph:verb — requires parsed morphology
 *
 * The parser is permissive: malformed tokens become free terms. Worst
 * case: result set is wider, never wrong.
 */

export interface ParsedQuery {
  /** Free-text terms that must all be present (AND-joined). */
  must: string[];
  /** Terms that must NOT be present. */
  mustNot: string[];
  /** OR groups — at least one term in each group must match. */
  shouldGroups: string[][];
  /** Quoted exact-phrase terms (must all be present). */
  phrases: string[];
  /** Field filters. */
  bookName?: string;
  chapterMin?: number;
  chapterMax?: number;
  /** Did the user actually use any structured filter? */
  hasStructure: boolean;
  /** Re-emitted plain-text query (for fallback hybrid search). */
  plain: string;
}

const FIELD_RE = /(\w+):([^\s"]+)/g;
const PHRASE_RE = /"([^"]+)"/g;

export function parseAdvancedQuery(raw: string): ParsedQuery {
  const result: ParsedQuery = {
    must: [],
    mustNot: [],
    shouldGroups: [],
    phrases: [],
    hasStructure: false,
    plain: '',
  };
  if (!raw || typeof raw !== 'string') return result;

  let working = raw.trim();
  if (!working) return result;

  // 1. Extract quoted phrases (keep them out of the token loop).
  working = working.replace(PHRASE_RE, (_, phrase: string) => {
    const trimmed = String(phrase).trim();
    if (trimmed) result.phrases.push(trimmed);
    return ' ';
  });

  // 2. Extract field filters. `book:Name+Of+Book` → "Name Of Book".
  working = working.replace(FIELD_RE, (_, key: string, value: string) => {
    const k = String(key).toLowerCase();
    const v = String(value).replace(/\+/g, ' ').trim();
    if (!v) return ' ';
    switch (k) {
      case 'book':
        result.bookName = v;
        result.hasStructure = true;
        break;
      case 'chapter': {
        const range = v.match(/^(\d+)(?:-(\d+))?$/);
        if (range) {
          const lo = parseInt(range[1], 10);
          const hi = range[2] ? parseInt(range[2], 10) : lo;
          if (Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi) {
            result.chapterMin = lo;
            result.chapterMax = hi;
            result.hasStructure = true;
          }
        }
        break;
      }
      case 'lemma':
        // Lemma filtering without a word-Strong's table degenerates to a
        // literal term match — still useful for Greek/Hebrew strings that
        // appear in the source-language translations (TR, WLC).
        result.must.push(v);
        result.hasStructure = true;
        break;
      default:
        // Unknown field → fall back to free term so the user isn't punished.
        result.must.push(`${k}:${v}`);
    }
    return ' ';
  });

  // 3. Tokenize remaining text honouring AND / OR / -prefix.
  const tokens = working
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    const upper = tok.toUpperCase();

    if (upper === 'AND') {
      i++;
      continue;
    }

    // OR groups: we look back at the previous term and forward to the next.
    // Pattern: TERM OR TERM [OR TERM]...
    if (upper === 'OR' && result.must.length > 0 && i + 1 < tokens.length) {
      const left = result.must.pop()!;
      const group: string[] = [left];
      while (i + 1 < tokens.length && tokens[i].toUpperCase() === 'OR') {
        group.push(tokens[i + 1]);
        i += 2;
      }
      result.shouldGroups.push(group);
      result.hasStructure = true;
      continue;
    }

    if (tok.startsWith('-') && tok.length > 1) {
      result.mustNot.push(tok.slice(1));
      result.hasStructure = true;
      i++;
      continue;
    }

    result.must.push(tok);
    i++;
  }

  // Re-emit plain text (for vector retriever fallback): all must-terms +
  // phrases joined with spaces, without operator noise.
  result.plain = [...result.phrases, ...result.must, ...result.shouldGroups.flat()]
    .join(' ')
    .trim();

  return result;
}

/**
 * Build a Postgres `tsquery` string from a ParsedQuery. Uses `&` (AND),
 * `|` (OR groups) and `!` (NOT). Phrases use the `<->` proximity operator
 * for adjacent matches.
 *
 * Returns null when there's nothing to search (only filters, no terms).
 */
export function toTsQuery(p: ParsedQuery): string | null {
  const escape = (term: string) =>
    // Strip tsquery special chars; the lexer handles letters/digits/unicode.
    term.replace(/[&|!():'<>*]/g, ' ').trim().replace(/\s+/g, ' ');

  const phrasePart = (phrase: string) => {
    const words = escape(phrase).split(' ').filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0];
    return words.join(' <-> ');
  };

  const parts: string[] = [];

  for (const phrase of p.phrases) {
    const part = phrasePart(phrase);
    if (part) parts.push(`(${part})`);
  }
  for (const term of p.must) {
    const t = escape(term);
    if (t) parts.push(t.replace(/\s+/g, ' & '));
  }
  for (const group of p.shouldGroups) {
    const orPart = group
      .map((g) => escape(g))
      .filter(Boolean)
      .join(' | ');
    if (orPart) parts.push(`(${orPart})`);
  }
  for (const neg of p.mustNot) {
    const t = escape(neg);
    if (t) parts.push(`!${t}`);
  }

  if (parts.length === 0) return null;
  return parts.join(' & ');
}
