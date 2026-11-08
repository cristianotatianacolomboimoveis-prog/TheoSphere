/**
 * Orçamento da ingestão diária de embeddings em "BibleVerse".
 *
 * Por que existe: em 2026-11-08, cerca de 17 mil UPDATEs de embedding numa
 * única tarde dispararam um autovacuum na tabela. A limpeza do índice HNSW
 * (753 MB) passou de 6 horas, esgotou o Disk IO Budget do Supabase e derrubou
 * a busca em produção (mais de 90 s por consulta).
 *
 * Cada UPDATE de embedding deixa uma linha morta. A regra abaixo limita a
 * rodada do dia para que as linhas mortas fiquem abaixo do gatilho do
 * autovacuum (threshold + scale_factor × linhas vivas), com uma margem.
 * Também não roda com vacuum em andamento nem com o banco lento.
 */

export interface DailyEmbeddingProbe {
  /** Há vacuum (auto ou manual) em andamento em "BibleVerse". */
  vacuumRunning: boolean;
  /** pg_stat_user_tables.n_dead_tup */
  deadTuples: number;
  /** pg_class.reltuples (ou n_live_tup) */
  liveTuples: number;
  /** autovacuum_vacuum_threshold efetivo da tabela */
  vacuumThreshold: number;
  /** autovacuum_vacuum_scale_factor efetivo da tabela */
  vacuumScaleFactor: number;
  /** Tempo de uma consulta pequena por índice, medido agora. */
  probeLatencyMs: number;
  /** Versículos ainda sem embedding nas traduções pedidas. */
  pending: number;
}

export interface DailyEmbeddingOptions {
  dailyLimit: number;
  maxProbeLatencyMs: number;
  /** Fração do gatilho do autovacuum mantida livre (0.1 = para em 90%). */
  safetyMargin: number;
}

export interface DailyEmbeddingPlan {
  run: boolean;
  limit: number;
  reason: string;
  /** Linhas mortas que ainda cabem antes do gatilho (com margem). */
  headroom: number;
}

export const DAILY_EMBEDDING_DEFAULTS: DailyEmbeddingOptions = {
  dailyLimit: 2000,
  maxProbeLatencyMs: 2000,
  safetyMargin: 0.1,
};

export function autovacuumTrigger(p: DailyEmbeddingProbe): number {
  return p.vacuumThreshold + p.vacuumScaleFactor * p.liveTuples;
}

export function planDailyEmbedding(
  p: DailyEmbeddingProbe,
  opts: DailyEmbeddingOptions = DAILY_EMBEDDING_DEFAULTS,
): DailyEmbeddingPlan {
  const headroom = Math.max(
    0,
    Math.floor(autovacuumTrigger(p) * (1 - opts.safetyMargin)) - p.deadTuples,
  );
  const skip = (reason: string): DailyEmbeddingPlan => ({
    run: false,
    limit: 0,
    reason,
    headroom,
  });

  if (p.pending <= 0) return skip('nada pendente');
  if (p.vacuumRunning) return skip('vacuum em andamento em BibleVerse');
  if (p.probeLatencyMs > opts.maxProbeLatencyMs)
    return skip(
      `banco lento (${Math.round(p.probeLatencyMs)} ms > ${opts.maxProbeLatencyMs} ms)`,
    );
  if (headroom <= 0)
    return skip(
      'folga de linhas mortas esgotada: rodar agora dispararia o autovacuum; ' +
        'é preciso um VACUUM numa janela sem usuários',
    );

  const limit = Math.min(opts.dailyLimit, headroom, p.pending);
  return { run: true, limit, reason: 'ok', headroom };
}
