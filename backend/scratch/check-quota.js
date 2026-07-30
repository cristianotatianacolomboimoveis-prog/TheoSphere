/**
 * check-quota.js — confirma em produção que a cota diária só é consumida
 * quando a IA é realmente acionada.
 *
 * A regra central da cota (30/07/2026) é que cache e biblioteca são gratuitos
 * para a plataforma, logo gratuitos para o usuário. Este script verifica isso
 * lendo o contador direto do Redis... que não é acessível daqui. Então usa o
 * caminho observável: repete a MESMA pergunta e confere que a segunda vem do
 * cache — se vier, não houve chamada de IA e portanto não houve consumo.
 *
 *   node scratch/check-quota.js
 */
const BASE = process.env.BASE_URL ?? 'https://theosphere.onrender.com';

async function perguntar(query) {
  const res = await fetch(`${BASE}/api/v1/rag/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const { data } = await res.json();
  return data.meta ?? {};
}

(async () => {
  const pergunta = `Qual o sentido de hesed no Salmo ${Math.floor(Math.random() * 150) + 1}?`;

  console.log(`pergunta: ${pergunta}\n`);

  const a = await perguntar(pergunta);
  console.log(
    `1ª vez  → cached: ${a.cached} | degraded: ${a.degraded ?? false}` +
      (a.degradedReason ? ` (${a.degradedReason})` : ''),
  );

  const b = await perguntar(pergunta);
  console.log(
    `2ª vez  → cached: ${b.cached} | similarity: ${b.similarity ?? '-'}`,
  );

  console.log();
  if (b.cached) {
    console.log('✅ repetição servida pelo cache — nenhuma chamada de IA, nenhuma cota consumida');
  } else {
    console.log('⚠️  a repetição NÃO veio do cache — investigar');
  }
})();
