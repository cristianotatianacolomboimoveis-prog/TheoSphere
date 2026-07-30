/**
 * tune-thinking.js — procura a combinação de thinkingBudget + maxOutputTokens
 * que entrega resposta COMPLETA (finishReason STOP) com o menor custo.
 *
 * Tokens de raciocínio são cobrados como saída — o item mais caro. Limitar o
 * raciocínio corta custo E libera espaço para a resposta.
 *
 *   node scratch/tune-thinking.js
 */
require('dotenv').config({ quiet: true });

const KEY = process.env.GEMINI_API_KEY;
const PERGUNTA =
  'O que significa o termo grego "dikaiosyne" em Romanos 3:21-26? Responda com profundidade acadêmica.';

async function testar(thinkingBudget, maxOutputTokens) {
  const generationConfig = { temperature: 0.7, maxOutputTokens };
  if (thinkingBudget !== null) {
    generationConfig.thinkingConfig = { thinkingBudget };
  }

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: PERGUNTA }] }],
        generationConfig,
      }),
    },
  );

  if (!res.ok) {
    const t = await res.text();
    return { erro: `HTTP ${res.status} ${t.slice(0, 120)}` };
  }

  const d = await res.json();
  const cand = d.candidates?.[0];
  const texto = cand?.content?.parts?.map((p) => p.text).join('') ?? '';
  const u = d.usageMetadata ?? {};
  return {
    finish: cand?.finishReason,
    raciocinio: u.thoughtsTokenCount ?? 0,
    resposta: u.candidatesTokenCount ?? 0,
    chars: texto.length,
    completa: cand?.finishReason === 'STOP',
  };
}

(async () => {
  const cenarios = [
    [null, 3000, 'atual em produção (raciocínio livre)'],
    [0, 2000, 'raciocínio desligado'],
    [512, 2500, 'raciocínio limitado a 512'],
    [1024, 3000, 'raciocínio limitado a 1024'],
  ];

  for (const [budget, max, rotulo] of cenarios) {
    const r = await testar(budget, max);
    if (r.erro) {
      console.log(`${rotulo}: ${r.erro}`);
      continue;
    }
    console.log(
      `${r.completa ? '✅' : '✂️ '} ${rotulo}\n` +
        `   thinkingBudget=${budget ?? 'livre'} maxOutput=${max} → ` +
        `finish=${r.finish} | raciocínio=${r.raciocinio} | resposta=${r.resposta} tok (${r.chars} chars)\n`,
    );
  }
})();
