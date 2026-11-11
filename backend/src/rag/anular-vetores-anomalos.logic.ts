/**
 * Regras de negócio, faixas aceitáveis e SQL para anulação de vetores anômalos.
 */

export interface TranslationAnomalyRange {
  min: number;
  max: number;
}

export const ANOMALOUS_EXPECTED_RANGES: Record<
  string,
  TranslationAnomalyRange
> = {
  BLIVRE: { min: 1000, max: 3500 },
  NVA: { min: 200, max: 1200 },
  TR: { min: 300, max: 1000 },
};

export const ANOMALY_NORM_BOUNDS = {
  min: 0.2,
  max: 0.85,
};

export const SQL_QUERIES = {
  SCAN_BATCH: `
    SELECT id, "bookId", chapter, verse, vector_norm(embedding) AS n
    FROM "BibleVerse"
    WHERE translation = $1 AND ("bookId", chapter, verse) > ($2, $3, $4)
      AND embedding IS NOT NULL
    ORDER BY "bookId", chapter, verse
    LIMIT $5
  `.trim(),

  UPDATE_BATCH: `
    UPDATE "BibleVerse"
    SET embedding = NULL
    WHERE id = ANY($1::text[])
      AND vector_norm(embedding) NOT BETWEEN 0.20 AND 0.85
  `.trim(),

  PENDING_COUNT: `
    SELECT count(*)::int AS count
    FROM (
      SELECT 1 FROM "BibleVerse"
      WHERE translation = $1 AND embedding IS NULL
      LIMIT $2
    ) s
  `.trim(),
};

/**
 * Valida se as contagens totais de versículos anômalos estão dentro das faixas esperadas.
 * Se isLimitedByMaxLinhas for true, a checagem é relaxada para permitir simulações e testes parciais.
 */
export function validateAnomalousCounts(
  counts: Record<string, number>,
  isLimitedByMaxLinhas = false,
): { ok: boolean; reason?: string } {
  const total = Object.values(counts).reduce((acc, c) => acc + c, 0);
  if (total === 0) {
    return { ok: true, reason: 'nada a anular' };
  }

  if (isLimitedByMaxLinhas) {
    return { ok: true };
  }

  for (const [translation, range] of Object.entries(
    ANOMALOUS_EXPECTED_RANGES,
  )) {
    const count = counts[translation] ?? 0;
    if (count < range.min || count > range.max) {
      return {
        ok: false,
        reason: `Contagem anômala de ${translation} (${count}) fora da faixa esperada [${range.min}, ${range.max}]. Abortando por segurança.`,
      };
    }
  }

  return { ok: true };
}

/**
 * Valida se a folga do autovacuum comporta a anulação e a ingestão diária seguinte com margem de segurança.
 * Regra: headroom >= totalToAnulate + 2000
 */
export function validateHeadroom(
  headroom: number,
  totalToAnulate: number,
  safetyMargin = 2000,
): { ok: boolean; reason?: string; required: number } {
  const required = totalToAnulate + safetyMargin;
  if (headroom < required) {
    return {
      ok: false,
      required,
      reason: `Folga de autovacuum insuficiente: disponível=${headroom} < necessário=${required} (${totalToAnulate} anulados + ${safetyMargin} margem).`,
    };
  }
  return { ok: true, required };
}
