import {
  DailyEmbeddingProbe,
  autovacuumTrigger,
  evaluateEmbeddingBudgetWithEarlyExit,
  formatLimitedPending,
  planDailyEmbedding,
} from './daily-embedding-budget';

// Números reais de 2026-11-08: 186.476 linhas vivas, gatilho padrão do
// Postgres (50 + 0,2 × vivas) ≈ 37.345.
const base: DailyEmbeddingProbe = {
  vacuumRunning: false,
  deadTuples: 0,
  liveTuples: 186_476,
  vacuumThreshold: 50,
  vacuumScaleFactor: 0.2,
  probeLatencyMs: 50,
  pending: 14_077,
};

describe('planDailyEmbedding', () => {
  it('roda no limite diário quando há folga', () => {
    const plan = planDailyEmbedding(base);
    expect(plan).toMatchObject({ run: true, limit: 2000, reason: 'ok' });
  });

  it('não passa do que falta', () => {
    expect(planDailyEmbedding({ ...base, pending: 300 }).limit).toBe(300);
  });

  it('não roda com vacuum em andamento (incidente de 2026-11-08)', () => {
    const plan = planDailyEmbedding({ ...base, vacuumRunning: true });
    expect(plan.run).toBe(false);
    expect(plan.reason).toMatch(/vacuum/);
  });

  it('não roda com o banco lento', () => {
    const plan = planDailyEmbedding({ ...base, probeLatencyMs: 5091 });
    expect(plan.run).toBe(false);
    expect(plan.reason).toMatch(/lento/);
  });

  it('corta a rodada para não cruzar o gatilho do autovacuum', () => {
    const trigger = autovacuumTrigger(base); // 37.345,2
    const dead = 33_000;
    const plan = planDailyEmbedding({ ...base, deadTuples: dead });
    expect(plan.run).toBe(true);
    expect(plan.limit).toBe(Math.floor(trigger * 0.9) - dead); // 610
    expect(dead + plan.limit).toBeLessThan(trigger);
  });

  it('para quando a folga acabou, em vez de disparar o vacuum', () => {
    const plan = planDailyEmbedding({ ...base, deadTuples: 40_000 });
    expect(plan.run).toBe(false);
    expect(plan.headroom).toBe(0);
    expect(plan.reason).toMatch(/folga/);
  });

  it('nada pendente não é erro', () => {
    expect(planDailyEmbedding({ ...base, pending: 0 })).toMatchObject({
      run: false,
      reason: 'nada pendente',
    });
  });

  it('permite planejamento preliminar sem especificar pending', () => {
    const { pending, ...cheapBase } = base;
    const plan = planDailyEmbedding(cheapBase);
    expect(plan.run).toBe(true);
    expect(plan.limit).toBe(2000);
  });
});

describe('formatLimitedPending', () => {
  it('contagem limitada mostra mais de N', () => {
    const res = formatLimitedPending(2001, 2000);
    expect(res).toEqual({
      count: 2000,
      hasMore: true,
      display: 'mais de 2000',
    });
  });

  it('mostra número exato quando abaixo ou igual ao limite', () => {
    const res = formatLimitedPending(350, 2000);
    expect(res).toEqual({
      count: 350,
      hasMore: false,
      display: '350',
    });
  });
});

describe('evaluateEmbeddingBudgetWithEarlyExit', () => {
  const { pending, ...cheapProbe } = base;

  it('checagem barata manda adiar → não conta pendentes (folga esgotada)', async () => {
    const countPendingFn = jest.fn().mockResolvedValue(100);
    const probeExhausted = { ...cheapProbe, deadTuples: 40_000 };

    const result = await evaluateEmbeddingBudgetWithEarlyExit(
      probeExhausted,
      countPendingFn,
    );

    expect(countPendingFn).not.toHaveBeenCalled();
    expect(result.pendingEvaluated).toBe(false);
    expect(result.pendingDisplay).toMatch(/não verificado/);
    expect(result.plan.run).toBe(false);
    expect(result.plan.reason).toMatch(/folga/);
  });

  it('checagem barata manda adiar → não conta pendentes (vacuum em andamento)', async () => {
    const countPendingFn = jest.fn().mockResolvedValue(100);
    const probeVacuum = { ...cheapProbe, vacuumRunning: true };

    const result = await evaluateEmbeddingBudgetWithEarlyExit(
      probeVacuum,
      countPendingFn,
    );

    expect(countPendingFn).not.toHaveBeenCalled();
    expect(result.pendingEvaluated).toBe(false);
    expect(result.plan.run).toBe(false);
    expect(result.plan.reason).toMatch(/vacuum/);
  });

  it('checagem barata manda adiar → não conta pendentes (banco lento)', async () => {
    const countPendingFn = jest.fn().mockResolvedValue(100);
    const probeSlow = { ...cheapProbe, probeLatencyMs: 3500 };

    const result = await evaluateEmbeddingBudgetWithEarlyExit(
      probeSlow,
      countPendingFn,
    );

    expect(countPendingFn).not.toHaveBeenCalled();
    expect(result.pendingEvaluated).toBe(false);
    expect(result.plan.run).toBe(false);
    expect(result.plan.reason).toMatch(/lento/);
  });

  it('checagem barata aprova e contagem limitada mostra mais de N', async () => {
    const countPendingFn = jest.fn().mockResolvedValue(2001);

    const result = await evaluateEmbeddingBudgetWithEarlyExit(
      cheapProbe,
      countPendingFn,
    );

    expect(countPendingFn).toHaveBeenCalledWith(2001);
    expect(result.pendingEvaluated).toBe(true);
    expect(result.pendingDisplay).toBe('mais de 2000');
    expect(result.plan.run).toBe(true);
    expect(result.plan.limit).toBe(2000);
  });

  it('checagem barata aprova mas contagem retorna 0 (nada pendente)', async () => {
    const countPendingFn = jest.fn().mockResolvedValue(0);

    const result = await evaluateEmbeddingBudgetWithEarlyExit(
      cheapProbe,
      countPendingFn,
    );

    expect(countPendingFn).toHaveBeenCalledWith(2001);
    expect(result.pendingEvaluated).toBe(true);
    expect(result.pendingDisplay).toBe('0');
    expect(result.plan.run).toBe(false);
    expect(result.plan.reason).toBe('nada pendente');
  });
});
