/**
 * ab-system-prompt.js — compara o system prompt ANTES e DEPOIS do enxugamento
 * de 30/07/2026, com as mesmas perguntas, para julgar se a qualidade caiu.
 *
 * Chama o Gemini direto (não passa pelo backend) para isolar a variável:
 * mesma pergunta, mesmo modelo, mesma temperatura — só o system prompt muda.
 *
 *   node scratch/ab-system-prompt.js
 *
 * Gasta 2 chamadas por pergunta. A chave sai do .env e nunca é impressa.
 */
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ quiet: true });

const MODEL = 'gemini-2.5-flash';
const KEY = process.env.GEMINI_API_KEY;

// Versão atual (enxuta), lida do próprio fonte.
const promptsSrc = fs.readFileSync(
  path.join(__dirname, '../src/rag/prompts.ts'),
  'utf8',
);
const DEPOIS = promptsSrc.match(
  /THEO_AI_SYSTEM_PROMPT\s*=\s*`([\s\S]*?)`;/,
)[1];

// Versão anterior, recuperada do git (commit antes do enxugamento).
const ANTES = fs.readFileSync(path.join(__dirname, '.prompt-antes.txt'), 'utf8');

const PERGUNTAS = [
  'O que significa o termo grego "dikaiosyne" em Romanos 3:21-26?',
  'Qual a diferença entre a visão calvinista e arminiana sobre a perseverança dos santos?',
  'Como responder ao problema do mal a partir da teodiceia de Plantinga?',
  'Explique a estrutura sintática de João 1:1 e a questão do artigo em "theos".',
  'Quem foi Melquisedeque e qual sua importância teológica?',
];

async function perguntar(systemPrompt, pergunta) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: pergunta }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    return { erro: `HTTP ${res.status}: ${t.slice(0, 200)}` };
  }
  const data = await res.json();
  const texto =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  return { texto, tokens: data.usageMetadata };
}

(async () => {
  if (!KEY) {
    console.error('Sem GEMINI_API_KEY no .env');
    process.exit(1);
  }

  const linhas = [
    '# A/B do system prompt — 2026-07-30',
    '',
    `Modelo: ${MODEL} · temperatura 0.7 · maxOutputTokens 1500`,
    '',
    `- **ANTES:** ${ANTES.length} caracteres (~${Math.round(ANTES.length / 4)} tokens)`,
    `- **DEPOIS:** ${DEPOIS.length} caracteres (~${Math.round(DEPOIS.length / 4)} tokens)`,
    '',
    '---',
    '',
  ];

  for (const [i, pergunta] of PERGUNTAS.entries()) {
    console.log(`[${i + 1}/${PERGUNTAS.length}] ${pergunta.slice(0, 60)}…`);
    const a = await perguntar(ANTES, pergunta);
    const b = await perguntar(DEPOIS, pergunta);

    linhas.push(`## ${i + 1}. ${pergunta}`, '');
    linhas.push(
      `**ANTES** (entrada: ${a.tokens?.promptTokenCount ?? '?'} tok · saída: ${a.tokens?.candidatesTokenCount ?? '?'} tok)`,
      '',
      a.erro ? `\`${a.erro}\`` : a.texto,
      '',
      `**DEPOIS** (entrada: ${b.tokens?.promptTokenCount ?? '?'} tok · saída: ${b.tokens?.candidatesTokenCount ?? '?'} tok)`,
      '',
      b.erro ? `\`${b.erro}\`` : b.texto,
      '',
      '---',
      '',
    );
  }

  const out = path.join(
    __dirname,
    '../../audit/reports/2026-07-30_ab_system_prompt.md',
  );
  fs.writeFileSync(out, linhas.join('\n'), 'utf8');
  console.log(`\nRelatório: ${out}`);
})();
