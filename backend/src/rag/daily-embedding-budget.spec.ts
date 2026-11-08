import {
  DailyEmbeddingProbe,
  autovacuumTrigger,
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
});
