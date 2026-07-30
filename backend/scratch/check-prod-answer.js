/**
 * check-prod-answer.js — confere se a resposta de produção chega COMPLETA.
 *
 * Em 30/07/2026 o teto de saída somado ao raciocínio do gemini-2.5-flash
 * truncava a resposta no meio da frase. Este script mostra o tamanho e o
 * final do texto, que é onde a truncagem aparece.
 *
 *   node scratch/check-prod-answer.js
 *   node scratch/check-prod-answer.js "sua pergunta aqui"
 */
const BASE = process.env.BASE_URL ?? 'https://theosphere.onrender.com';
const pergunta =
  process.argv[2] ?? 'O que significa dikaiosyne em Romanos 3:21-26?';

(async () => {
  const res = await fetch(`${BASE}/api/v1/rag/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: pergunta }),
  });

  const { data } = await res.json();
  const texto = data.content ?? '';
  const m = data.meta ?? {};

  console.log(`pergunta : ${pergunta}`);
  console.log(`cached   : ${m.cached} | degraded: ${m.degraded ?? false}`);
  console.log(`tamanho  : ${texto.length} caracteres`);
  console.log(`final    : …${texto.slice(-110).replace(/\s+/g, ' ')}`);

  // Heurística de truncagem: termina sem pontuação final.
  const truncada = !/[.!?"')\]}»…]\s*$/.test(texto.trim());
  console.log(`\n${truncada ? '✂️  PARECE TRUNCADA' : '✅ parece completa'}`);
})();
