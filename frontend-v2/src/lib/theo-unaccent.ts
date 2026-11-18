/**
 * Utilitário de normalização e destaque de texto sem acentos e sem diacríticos (Etapa 9.1).
 * Implementa a mesma lógica da função public.theo_unaccent no PostgreSQL:
 * 1. normalize(text, 'NFD')
 * 2. substitui maqaf, paseq, sof pasuq e nun hafukha ([\u05BE\u05C0\u05C3\u05C6]) por espaço
 * 3. remove diacríticos latinos/gregos e niqqud/cantilações hebraicas ([\u0300-\u036F\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7])
 */
export function theoUnaccent(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u05BE\u05C0\u05C3\u05C6]/g, " ")
    .replace(
      /[\u0300-\u036F\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g,
      "",
    );
}

export interface MatchRange {
  start: number;
  end: number;
}

/**
 * Localiza os intervalos exatos [start, end] no texto original que casam
 * com a consulta sem acentos / diacríticos.
 */
export function findMatchRanges(text: string, query: string): MatchRange[] {
  if (!text || !query) return [];
  const normQuery = theoUnaccent(query).toLowerCase().trim();
  if (!normQuery) return [];

  let normText = "";
  const origIndices: number[] = [];

  let origIdx = 0;
  for (const ch of text) {
    const normCh = theoUnaccent(ch).toLowerCase();
    for (let i = 0; i < normCh.length; i++) {
      origIndices.push(origIdx);
      normText += normCh[i];
    }
    origIdx += ch.length;
  }
  origIndices.push(text.length);

  const ranges: MatchRange[] = [];
  let pos = 0;
  while ((pos = normText.indexOf(normQuery, pos)) !== -1) {
    const startOrig = origIndices[pos];
    const endPos = pos + normQuery.length;
    let endOrig = origIndices[endPos];
    // Inclui diacríticos combinantes anexados ao caractere final
    while (endOrig < text.length && theoUnaccent(text[endOrig]).length === 0) {
      endOrig++;
    }
    ranges.push({ start: startOrig, end: endOrig });
    pos += normQuery.length;
  }
  return ranges;
}
