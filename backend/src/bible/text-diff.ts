/**
 * text-diff.ts — Algoritmo de Diferenciação Textual e Alinhamento Sinótico.
 *
 * Utiliza o algoritmo Longest Common Subsequence (LCS) adaptado para análise exegética bíblica.
 * Permite comparar duas ou mais traduções bíblicas palavra por palavra, identificando:
 *   • Palavras idênticas (equal)
 *   • Acréscimos textuais (added)
 *   • Omissões textuais (removed)
 *   • Cálculo de percentual de similaridade léxica.
 */

export type DiffTokenType = 'equal' | 'added' | 'removed';

export interface DiffToken {
  type: DiffTokenType;
  text: string;
}

export interface TextDiffResult {
  similarity: number;
  tokens: DiffToken[];
  addedCount: number;
  removedCount: number;
  equalCount: number;
}

/**
 * Normaliza um token para comparação léxica (ignora pontuação e diacríticos secundários,
 * mas preserva caracteres gregos, hebraicos e latinos).
 */
export function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Executa o diff palavra a palavra entre um texto base e um texto de destino.
 */
export function computeWordDiff(
  baseText: string,
  targetText: string,
): TextDiffResult {
  if (!baseText && !targetText) {
    return {
      similarity: 100,
      tokens: [],
      addedCount: 0,
      removedCount: 0,
      equalCount: 0,
    };
  }

  const baseWords = (baseText || '').trim().split(/\s+/).filter(Boolean);
  const targetWords = (targetText || '').trim().split(/\s+/).filter(Boolean);

  const n = baseWords.length;
  const m = targetWords.length;

  if (n === 0 && m > 0) {
    return {
      similarity: 0,
      tokens: targetWords.map((w) => ({ type: 'added', text: w })),
      addedCount: m,
      removedCount: 0,
      equalCount: 0,
    };
  }

  if (m === 0 && n > 0) {
    return {
      similarity: 0,
      tokens: baseWords.map((w) => ({ type: 'removed', text: w })),
      addedCount: 0,
      removedCount: n,
      equalCount: 0,
    };
  }

  // Tabela LCS bidimensional
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );

  for (let i = 1; i <= n; i++) {
    const baseClean = normalizeToken(baseWords[i - 1]);
    for (let j = 1; j <= m; j++) {
      const targetClean = normalizeToken(targetWords[j - 1]);
      if (baseClean === targetClean && baseClean.length > 0) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtracking para reconstrução dos tokens de diff
  let i = n;
  let j = m;
  const rawTokens: DiffToken[] = [];

  while (i > 0 || j > 0) {
    const baseClean = i > 0 ? normalizeToken(baseWords[i - 1]) : '';
    const targetClean = j > 0 ? normalizeToken(targetWords[j - 1]) : '';

    if (i > 0 && j > 0 && baseClean === targetClean && baseClean.length > 0) {
      rawTokens.push({ type: 'equal', text: targetWords[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawTokens.push({ type: 'added', text: targetWords[j - 1] });
      j--;
    } else if (i > 0) {
      rawTokens.push({ type: 'removed', text: baseWords[i - 1] });
      i--;
    }
  }

  rawTokens.reverse();

  let equalCount = 0;
  let addedCount = 0;
  let removedCount = 0;

  for (const t of rawTokens) {
    if (t.type === 'equal') equalCount++;
    else if (t.type === 'added') addedCount++;
    else if (t.type === 'removed') removedCount++;
  }

  const totalTokens = n + m;
  const similarity =
    totalTokens > 0
      ? Math.min(100, Math.round((2 * equalCount * 100) / totalTokens))
      : 100;

  return {
    similarity,
    tokens: rawTokens,
    addedCount,
    removedCount,
    equalCount,
  };
}
