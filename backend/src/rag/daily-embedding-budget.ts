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
 *
 * Arquitetura Supabase Nano (512 MB RAM):
 * Checagens baratas (catálogo e metadados) são executadas antes de qualquer
 * contagem de versículos pendentes. Se uma checagem barata adiar a rodada,
 * a contagem sequencial na tabela não é executada. A contagem, quando necessária,
 * é limitada a (limite + 1).
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
  /** Versículos ainda sem embedding nas traduções pedidas (opcional na checagem barata). */
  pending?: number;
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

export interface LimitedPendingCount {
  count: number;
  hasMore: boolean;
  display: string;
}

export interface BudgetEvaluationResult {
  plan: DailyEmbeddingPlan;
  pendingEvaluated: boolean;
  pendingDisplay: string;
}

export const DAILY_EMBEDDING_DEFAULTS: DailyEmbeddingOptions = {
  dailyLimit: 2000,
  maxProbeLatencyMs: 2000,
  safetyMargin: 0.1,
};

export function autovacuumTrigger(
  p: Pick<
    DailyEmbeddingProbe,
    'vacuumThreshold' | 'vacuumScaleFactor' | 'liveTuples'
  >,
): number {
  return p.vacuumThreshold + p.vacuumScaleFactor * p.liveTuples;
}

export function formatLimitedPending(
  rawCount: number,
  limit: number,
): LimitedPendingCount {
  const hasMore = rawCount > limit;
  const count = hasMore ? limit : rawCount;
  return {
    count,
    hasMore,
    display: hasMore ? `mais de ${limit}` : `${count}`,
  };
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

  // 1. Checagens baratas prioritárias (catálogo e sondagem de latência)
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

  // 2. Checagem de versículos pendentes (apenas se avaliada)
  if (p.pending !== undefined && p.pending <= 0) return skip('nada pendente');

  const limit = Math.min(
    opts.dailyLimit,
    headroom,
    p.pending !== undefined ? p.pending : Infinity,
  );
  return { run: true, limit, reason: 'ok', headroom };
}

/**
 * Avalia o orçamento da rodada garantindo early-exit nas checagens baratas.
 * `countPendingFn` NUNCA é chamado se vacuum estiver rodando, o banco estiver
 * lento ou a folga de linhas mortas estiver esgotada.
 */
export async function evaluateEmbeddingBudgetWithEarlyExit(
  probe: Omit<DailyEmbeddingProbe, 'pending'>,
  countPendingFn: (limitPlusOne: number) => Promise<number>,
  opts: DailyEmbeddingOptions = DAILY_EMBEDDING_DEFAULTS,
): Promise<BudgetEvaluationResult> {
  const prePlan = planDailyEmbedding(probe, opts);
  if (!prePlan.run) {
    return {
      plan: prePlan,
      pendingEvaluated: false,
      pendingDisplay: 'não verificado (adiado na checagem preliminar)',
    };
  }

  const limitToTest = prePlan.limit;
  const rawCount = await countPendingFn(limitToTest + 1);
  const limited = formatLimitedPending(rawCount, limitToTest);
  const finalPlan = planDailyEmbedding(
    { ...probe, pending: limited.count },
    opts,
  );

  return {
    plan: finalPlan,
    pendingEvaluated: true,
    pendingDisplay: limited.display,
  };
}

/**
 * Ordena versículos pela lista explícita de traduções (simulando ORDER BY array_position(targets, translation), "bookId", chapter, verse).
 * Garante que a ordem de processamento segue exatamente a sequência definida em targets (e não a ordem alfabética).
 */
export function sortVersesByTargetList<
  T extends {
    translation: string;
    bookId?: number;
    chapter?: number;
    verse?: number;
  },
>(verses: T[], targets: string[]): T[] {
  return [...verses].sort((a, b) => {
    const posA = targets.indexOf(a.translation);
    const posB = targets.indexOf(b.translation);
    const safeA = posA === -1 ? Number.MAX_SAFE_INTEGER : posA;
    const safeB = posB === -1 ? Number.MAX_SAFE_INTEGER : posB;
    if (safeA !== safeB) return safeA - safeB;
    if (
      a.bookId !== undefined &&
      b.bookId !== undefined &&
      a.bookId !== b.bookId
    ) {
      return a.bookId - b.bookId;
    }
    if (
      a.chapter !== undefined &&
      b.chapter !== undefined &&
      a.chapter !== b.chapter
    ) {
      return a.chapter - b.chapter;
    }
    if (a.verse !== undefined && b.verse !== undefined && a.verse !== b.verse) {
      return a.verse - b.verse;
    }
    return 0;
  });
}
