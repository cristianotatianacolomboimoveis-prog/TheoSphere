#!/usr/bin/env node
/**
 * Teste ponta a ponta do fluxo de um testador, contra o backend publicado.
 *
 *   node backend/scripts/smoke-teste-producao.mjs [URL_DO_BACKEND]
 *
 * Padrão: https://theosphere.onrender.com
 *
 * ESCREVE no banco: cria um usuário `smoke-<timestamp>@example.com`, uma
 * anotação e um feedback (categoria "elogio", texto "[smoke]"). Não chama a IA
 * (sem custo de Gemini). Sai com código 1 se qualquer etapa falhar.
 */
const BASE = (process.argv[2] || 'https://theosphere.onrender.com').replace(/\/$/, '');
const API = `${BASE}/api/v1`;
const stamp = Date.now();
const email = `smoke-${stamp}@example.com`;
const password = `Smoke${stamp}Ab9`;

const results = [];
let token = null;

async function call(method, path, body, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const started = Date.now();
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(90_000), // cold start do Render: até ~60 s
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* corpo vazio */
  }
  return { status: res.status, json, ms: Date.now() - started };
}

async function step(name, fn) {
  try {
    const detail = await fn();
    results.push({ etapa: name, ok: true, detalhe: detail ?? '' });
    return true;
  } catch (err) {
    results.push({ etapa: name, ok: false, detalhe: err.message });
    return false;
  }
}

function expectStatus(r, ...codes) {
  if (!codes.includes(r.status)) {
    const msg = r.json?.message ? ` — ${JSON.stringify(r.json.message)}` : '';
    throw new Error(`HTTP ${r.status}${msg}`);
  }
}

const startRef = 43003016; // Jo 3:16

(async () => {
  await step('servidor no ar (health/live)', async () => {
    const r = await call('GET', '/health/live');
    expectStatus(r, 200);
    return `${r.ms} ms`;
  });

  const registered = await step('cadastro', async () => {
    const r = await call('POST', '/auth/register', { email, password });
    expectStatus(r, 200, 201);
    return email;
  });

  const logged =
    registered &&
    (await step('login', async () => {
      const r = await call('POST', '/auth/login', { email, password });
      expectStatus(r, 200);
      token = r.json?.accessToken ?? r.json?.data?.accessToken;
      if (!token) throw new Error('resposta sem accessToken');
      return 'accessToken recebido';
    }));

  if (logged) {
    await step('anotação: gravar no servidor', async () => {
      const r = await call(
        'POST',
        '/annotations/sync',
        {
          items: [
            {
              startRef,
              endRef: startRef,
              kind: 'note',
              color: 'yellow',
              body: '[smoke] nota de teste',
              updatedAt: new Date().toISOString(),
            },
          ],
        },
        true,
      );
      expectStatus(r, 200, 201);
      if (r.json?.readOnlyDegraded)
        throw new Error('servidor respondeu readOnlyDegraded (banco ainda read-only)');
      return 'sincronizada';
    });

    await step('anotação: ler de volta', async () => {
      const r = await call(
        'GET',
        `/annotations?startRef=${startRef}&endRef=${startRef}`,
        undefined,
        true,
      );
      expectStatus(r, 200);
      const found = (r.json?.data ?? []).some((a) =>
        String(a.body ?? '').includes('[smoke]'),
      );
      if (!found) throw new Error('nota gravada não voltou na leitura');
      return 'encontrada';
    });

    await step('uso de IA do plano (billing/usage)', async () => {
      const r = await call('GET', '/billing/usage', undefined, true);
      expectStatus(r, 200);
      return JSON.stringify(r.json?.data ?? r.json).slice(0, 80);
    });
  }

  await step('feedback', async () => {
    const r = await call(
      'POST',
      '/feedback',
      { category: 'elogio', message: `[smoke] teste ponta a ponta ${stamp}`, rating: 5 },
      Boolean(token),
    );
    expectStatus(r, 201);
    return `id ${r.json?.data?.id}`;
  });

  await step('leitura bíblica (bible/chapter)', async () => {
    const r = await call('GET', '/bible/chapter/BLIVRE/43/3');
    expectStatus(r, 200);
    const n = r.json?.data?.verses?.length ?? 0;
    if (n < 30) throw new Error(`só ${n} versículos em Jo 3`);
    return `${n} versículos`;
  });

  console.table(results);
  const failed = results.filter((r) => !r.ok).length;
  console.log(
    failed
      ? `\n❌ ${failed} etapa(s) falharam.`
      : `\n✅ Fluxo do testador funcionando de ponta a ponta (${results.length} etapas).`,
  );
  process.exit(failed ? 1 : 0);
})();
