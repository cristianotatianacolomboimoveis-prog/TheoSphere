/**
 * check-thinking-budget.js — o gemini-2.5-flash pensa antes de responder, e
 * os tokens de raciocínio consomem o mesmo maxOutputTokens da resposta.
 *
 * Isso importa porque em 30/07/2026 baixamos maxOutputTokens de 3000 para
 * 1500 para economizar. Se o raciocínio consumir a maior parte do teto, a
 * resposta chega truncada no meio da frase — regressão de qualidade
 * disfarçada de economia.
 *
 *   node scratch/check-thinking-budget.js
 */
require('dotenv').config({ quiet: true });

const KEY = process.env.GEMINI_API_KEY;
const PERGUNTA =
  'O que significa o termo grego "dikaiosyne" em Romanos 3:21-26? Responda com profundidade acadêmica.';

async function testar(maxOutputTokens) {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: PERGUNTA }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens },
      }),
    },
  );
  const d = await res.json();
  const cand = d.candidates?.[0];
  const texto =
    cand?.content?.parts?.map((p) => p.text).join('') ?? '(vazio)';
  const u = d.usageMetadata ?? {};
  return {
    maxOutputTokens,
    finishReason: cand?.finishReason,
    raciocinio: u.thoughtsTokenCount ?? 0,
    resposta: u.candidatesTokenCount ?? 0,
    chars: texto.length,
    fim: texto.slice(-60).replace(/\s+/g, ' '),
  };
}

(async () => {
  for (const teto of [1500, 3000]) {
    const r = await testar(teto);
    console.log(
      `maxOutputTokens=${r.maxOutputTokens} | finish=${r.finishReason} | ` +
        `raciocínio=${r.raciocinio} tok | resposta=${r.resposta} tok | ${r.chars} chars`,
    );
    console.log(`   termina em: …${r.fim}\n`);
  }
})();
