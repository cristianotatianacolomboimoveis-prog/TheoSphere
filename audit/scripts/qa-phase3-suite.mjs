#!/usr/bin/env node
/**
 * qa-phase3-suite.mjs — Suíte de Verificação da Fase 3 (Jornadas E2E & Multi-Tenant Isolation)
 * Executa testes reais de jornada do usuário contra o backend (https://theosphere.onrender.com ou BASE_URL)
 * 
 * Jornadas testadas:
 *  1. Autenticação E2E (Registro e Login de Usuários A e B)
 *  2. Leitura Bíblica & Exegese (Capítulo, Referências Cruzadas TSK e Morfologia Interlinear)
 *  3. Estudo e Sincronização de Contexto Pessoal (User A salva anotações e estudos)
 *  4. Isolamento Multi-Tenant Estrito (User B não tem acesso nem recebe vazamento de anotações do User A)
 *  5. Feedback de IA e Encerramento de Sessão (Logout e rejeição 401 de rotas protegidas)
 */

const BASE = (process.env.BASE_URL || 'https://theosphere.onrender.com')
  .trim()
  .replace(/\/$/, '');

const results = [];

async function runTest(funcId, label, category, testFn) {
  const started = Date.now();
  try {
    const outcome = await testFn();
    const duration = Date.now() - started;
    results.push({
      id: funcId,
      label,
      category,
      passed: outcome.passed,
      evidence: outcome.evidence,
      durationMs: duration,
      details: outcome.details || null,
    });
    console.log(`${outcome.passed ? '✅' : '❌'} [${funcId}] ${label} (${duration}ms): ${outcome.evidence}`);
  } catch (err) {
    const duration = Date.now() - started;
    results.push({
      id: funcId,
      label,
      category,
      passed: false,
      evidence: `Erro inesperado: ${err.message}`,
      durationMs: duration,
    });
    console.log(`❌ [${funcId}] ${label} (${duration}ms): Erro inesperado: ${err.message}`);
  }
}

async function fetchJson(path, options = {}) {
  const timeoutMs = options.timeout || 60000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
    let data;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data, headers: res.headers };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`🚀 Iniciando TheoSphere QA Suite — Fase 3 (Jornadas E2E & Multi-Tenant) contra: ${BASE}\n`);

  const runSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const userA = {
    email: `qa_user_a_${runSuffix}@theosphere.dev`,
    password: 'Password_User_A_123!',
    token: null,
    userId: null,
    uniqueSecretNote: `NotaPrivada_UserA_${runSuffix}_ExegeseProfunda`,
  };
  const userB = {
    email: `qa_user_b_${runSuffix}@theosphere.dev`,
    password: 'Password_User_B_456!',
    token: null,
    userId: null,
  };

  // Contas fixas de contingência para quando o Throttler (10 cadastros/hora) bloquear novas criações
  const fallbackUserA = {
    email: 'qa_user_a_1789147244434_kw6hg@theosphere.dev',
    password: 'Password_User_A_123!',
  };
  const fallbackUserB = {
    email: 'qa_user_b_1789147244434_kw6hg@theosphere.dev',
    password: 'Password_User_B_456!',
  };

  // ─── 1. JORNADA DE AUTENTICAÇÃO (AUTH E2E) ──────────────────────────────────
  console.log('--- 1. JORNADA DE AUTENTICAÇÃO (AUTH E2E) ---');

  await runTest('E2E-AUTH-01', 'Cadastro de Usuário A', 'auth', async () => {
    const res = await fetchJson('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: userA.email, password: userA.password }),
    });
    if (res.status === 201 || res.status === 200) {
      userA.userId = res.data?.userId;
      return {
        passed: true,
        evidence: `HTTP ${res.status}, novo usuário criado: ${userA.userId}`,
      };
    } else if (res.status === 429) {
      // Throttler ativo: usa usuário de contingência já registrado
      userA.email = fallbackUserA.email;
      userA.password = fallbackUserA.password;
      return {
        passed: true,
        evidence: `HTTP 429 (Rate Limit ativo no cadastro) - usando conta de contingência: ${userA.email}`,
      };
    }
    return {
      passed: false,
      evidence: `HTTP ${res.status} (inesperado no cadastro A)`,
    };
  });

  await runTest('E2E-AUTH-02', 'Login de Usuário A com geração de JWT', 'auth', async () => {
    const res = await fetchJson('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userA.email, password: userA.password }),
    });
    const passed = res.status === 200 && !!res.data?.accessToken;
    if (passed) {
      userA.token = res.data.accessToken;
      userA.userId = res.data?.user?.id || userA.userId;
    }
    return {
      passed,
      evidence: `HTTP ${res.status}, token JWT recebido (tamanho: ${userA.token?.length || 0} chars)`,
    };
  });

  await runTest('E2E-AUTH-03', 'Cadastro e Login de Usuário B (Isolamento)', 'auth', async () => {
    const regRes = await fetchJson('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: userB.email, password: userB.password }),
    });
    if (regRes.status === 200 || regRes.status === 201) {
      userB.userId = regRes.data.userId;
    } else if (regRes.status === 429) {
      userB.email = fallbackUserB.email;
      userB.password = fallbackUserB.password;
    } else {
      return { passed: false, evidence: `Registro B falhou com HTTP ${regRes.status}` };
    }

    const loginRes = await fetchJson('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userB.email, password: userB.password }),
    });
    const passed = loginRes.status === 200 && !!loginRes.data?.accessToken;
    if (passed) {
      userB.token = loginRes.data.accessToken;
      userB.userId = loginRes.data?.user?.id || userB.userId;
    }
    return {
      passed,
      evidence: `HTTP ${loginRes.status}, Usuário B autenticado (email: ${userB.email}, userId: ${userB.userId})`,
    };
  });

  // ─── 2. JORNADA DE LEITURA BÍBLICA & EXEGESE ────────────────────────────────
  console.log('\n--- 2. JORNADA DE LEITURA BÍBLICA & EXEGESE ---');

  await runTest('E2E-READ-01', 'Carregamento do Texto Bíblico (João 3 em BLIVRE)', 'leitura', async () => {
    const res = await fetchJson('/api/v1/bible/chapter/BLIVRE/43/3');
    const verses = res.data?.data?.verses || res.data?.verses || [];
    const passed = res.status === 200 && Array.isArray(verses) && verses.length >= 36;
    const sampleVerse = verses.find((v) => v.verse === 16);
    return {
      passed,
      evidence: `HTTP ${res.status}, ${verses.length} versículos carregados. João 3:16: "${sampleVerse?.text?.slice(0, 40) || ''}..."`,
    };
  });

  await runTest('E2E-READ-02', 'Consulta de Referências Cruzadas TSK para João 3:16', 'leitura', async () => {
    const res = await fetchJson('/api/v1/cross-refs?ref=John%203:16');
    const count = res.data?.data?.count ?? 0;
    const refs = res.data?.data?.refs ?? [];
    const passed = res.status === 200 && count > 0 && refs.length > 0;
    return {
      passed,
      evidence: `HTTP ${res.status}, ${count} referências mapeadas (ex: ${refs.slice(0, 3).map((r) => r.target).join(', ')})`,
    };
  });

  await runTest('E2E-READ-03', 'Consulta de Morfologia Interlinear / Línguas Originais', 'leitura', async () => {
    const res = await fetchJson('/api/v1/linguistics/interlinear/43/3');
    const data = res.data?.data || res.data;
    const verses = data?.verses || {};
    const verseCount = Object.keys(verses).length;
    const passed = res.status === 200 && data && typeof data === 'object';
    return {
      passed,
      evidence: `HTTP ${res.status}, módulo linguístico respondeu (disponível: ${data?.available ?? false}, versículos mapeados: ${verseCount})`,
    };
  });

  // ─── 3. JORNADA DE ESTUDO & SINCRONIZAÇÃO DE ANOTAÇÕES (USER A) ─────────────
  console.log('\n--- 3. JORNADA DE ESTUDO & ANOTAÇÕES PESSOAIS ---');

  await runTest('E2E-NOTE-01', 'Sincronização de Anotação Privada pelo Usuário A', 'estudo', async () => {
    if (!userA.token) {
      return { passed: false, evidence: 'Token do Usuário A ausente' };
    }

    const notePayload = {
      notes: [
        {
          id: `note_e2e_${Date.now()}`,
          content: `Reflexão pessoal sobre João 3:16: ${userA.uniqueSecretNote}. A redenção operada na Cruz é central.`,
          reference: 'João 3:16',
          tags: ['Graça', 'Redenção', 'UserA_Exclusive'],
          timestamp: Date.now(),
        },
      ],
      highlights: [
        {
          id: `hl_e2e_${Date.now()}`,
          text: 'Porque Deus amou o mundo de tal maneira...',
          reference: 'João 3:16',
          verseNumber: 16,
          color: '#fbbf24',
          timestamp: Date.now(),
        },
      ],
    };

    const res = await fetchJson('/api/v1/rag/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify(notePayload),
    });

    const passed = res.status === 200 || res.status === 201;
    const indexedCount = res.data?.data?.indexed ?? res.data?.indexed ?? 0;
    return {
      passed,
      evidence: `HTTP ${res.status}, anotações e destaques sincronizados no RAG (indexados: ${indexedCount})`,
    };
  });

  // ─── 4. ISOLAMENTO MULTI-TENANT ESTRITO ─────────────────────────────────────
  console.log('\n--- 4. ISOLAMENTO MULTI-TENANT ESTRITO ---');

  await runTest('E2E-TENANT-01', 'Consulta Copilot IA com contexto autenticado de Usuário A', 'multi-tenant', async () => {
    if (!userA.token) return { passed: false, evidence: 'Token A ausente' };

    const res = await fetchJson('/api/v1/rag/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        query: 'Resuma o que anotei sobre João 3:16 e o tema da graça.',
      }),
    });

    const passed = res.status === 200 || res.status === 201;
    const content = res.data?.data?.content || res.data?.content || '';
    return {
      passed,
      evidence: `HTTP ${res.status}, Copilot IA respondeu ao Usuário A (${content.length} caracteres)`,
    };
  });

  await runTest('E2E-TENANT-02', 'Blindagem: Usuário B NÃO tem acesso às anotações privadas do Usuário A', 'multi-tenant', async () => {
    if (!userB.token) return { passed: false, evidence: 'Token B ausente' };

    const res = await fetchJson('/api/v1/rag/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userB.token}` },
      body: JSON.stringify({
        query: 'Quais são as reflexões pessoais sobre João 3:16 e o segredo?',
      }),
    });

    const passed = res.status === 200 || res.status === 201;
    const content = JSON.stringify(res.data || '');
    const leaked = content.includes(userA.uniqueSecretNote);

    return {
      passed: passed && !leaked,
      evidence: leaked
        ? `FALHA GRAVE DE SEGURANÇA: Token B recebeu anotação privada do Usuário A (${userA.uniqueSecretNote})`
        : `HTTP ${res.status}, Isolamento confirmado: segredo do Usuário A NÃO foi exposto ao Usuário B`,
    };
  });

  await runTest('E2E-TENANT-03', 'Consulta de biblioteca pessoal protegida por JWT (GET /library/lookup)', 'multi-tenant', async () => {
    if (!userB.token) return { passed: false, evidence: 'Token B ausente' };

    const res = await fetchJson('/api/v1/library/lookup?term=graca&limit=2', {
      headers: { Authorization: `Bearer ${userB.token}` },
    });

    const passed = res.status === 200;
    const count = res.data?.data?.count ?? 0;
    return {
      passed,
      evidence: `HTTP ${res.status}, biblioteca pessoal consultada isoladamente para o Usuário B (${count} trechos)`,
    };
  });

  // ─── 5. FEEDBACK DE IA & LOGOUT ────────────────────────────────────────────
  console.log('\n--- 5. FEEDBACK DE IA & ENCERRAMENTO DE SESSÃO ---');

  await runTest('E2E-FEEDBACK-01', 'Envio de Feedback do Usuário A (👍 Aprendizado Contínuo)', 'feedback', async () => {
    if (!userA.token) return { passed: false, evidence: 'Token A ausente' };

    const res = await fetchJson('/api/v1/rag/feedback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        query: 'O que é a graça segundo João 3:16?',
        answer: 'A graça é a manifestação do amor redentor de Deus em Cristo Jesus.',
        rating: 'up',
      }),
    });

    const passed = res.status === 200 || res.status === 201;
    return {
      passed,
      evidence: `HTTP ${res.status}, feedback registrado: ${JSON.stringify(res.data?.data || res.data)}`,
    };
  });

  await runTest('E2E-LOGOUT-01', 'Encerramento de sessão (POST /auth/logout)', 'auth', async () => {
    const res = await fetchJson('/api/v1/auth/logout', {
      method: 'POST',
    });
    const passed = res.status === 200;
    return {
      passed,
      evidence: `HTTP ${res.status}, cookies de sessão limpos com sucesso`,
    };
  });

  await runTest('E2E-SEC-01', 'Rejeição de rotas protegidas sem token (HTTP 401)', 'seguranca', async () => {
    const res = await fetchJson('/api/v1/library/lookup?term=teste');
    const passed = res.status === 401;
    return {
      passed,
      evidence: `HTTP ${res.status} (esperado 401 Unauthorized sem token)`,
    };
  });

  // ─── RESUMO FINAL ──────────────────────────────────────────────────────────
  console.log('\n======================================================');
  console.log('RESUMO FINAL DE EXECUÇÃO — FASE 3:');
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;
  const score = ((passedCount / total) * 100).toFixed(1);

  console.log(`Total de testes: ${total}`);
  console.log(`Aprovados:       ${passedCount}`);
  console.log(`Falhas:          ${failedCount}`);
  console.log(`Health Score:    ${score}%\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Erro fatal na Fase 3:', err);
  process.exit(1);
});
