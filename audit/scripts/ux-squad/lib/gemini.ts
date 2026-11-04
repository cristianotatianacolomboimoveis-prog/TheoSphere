import fs from "fs";
import path from "path";
import { TaskVerdictSchema, type TaskVerdict } from "./types.js";

let callCount = 0;
const MAX_CALLS = parseInt(process.env.GEMINI_MAX_CALLS ?? "40", 10);

function getApiKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const candidates = [
    path.resolve(process.cwd(), "backend/.env"),
    path.resolve(process.cwd(), "../../../backend/.env"),
    path.resolve(process.cwd(), "../../backend/.env"),
    "/Users/cristianocolombo/Desktop/Theosphere 2026/backend/.env",
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      const match = fs.readFileSync(envPath, "utf8").match(/^GEMINI_API_KEY=(.*)$/m);
      if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

export async function evaluateTaskWithGemini(opts: {
  persona: { name: string; age?: number; profile: string; emoji: string };
  task: { id: string; title: string; success: string };
  execution: {
    ms: number;
    clicks: number;
    steps: { name: string; url: string; error?: string }[];
    checks: { name: string; ok: boolean; detail?: string }[];
    consoleErrors: string[];
    netIssues: { url: string; status: number }[];
  };
  screenshots: string[]; // paths to screenshots
}): Promise<{ verdict: TaskVerdict; raw: string; usedFallback?: boolean }> {
  const apiKey = getApiKey();
  if (!apiKey || callCount >= MAX_CALLS) {
    console.log(`[Gemini] Skipping AI call (apiKey: ${Boolean(apiKey)}, calls: ${callCount}/${MAX_CALLS})`);
    return {
      verdict: {
        result: opts.execution.checks.every((c) => c.ok) ? "✅" : "⚠️",
        ease: opts.execution.checks.every((c) => c.ok) ? 6 : 4,
        reaction: "Consegui realizar as ações na tela.",
        narration: `Eu naveguei pela tela para ${opts.task.title}.`,
        findings: [],
        jargon: [],
      },
      raw: "Local fallback due to missing key or call limit",
      usedFallback: true,
    };
  }

  callCount++;
  console.log(`[Gemini Vision] Chamada ${callCount}/${MAX_CALLS} para ${opts.persona.name} — ${opts.task.title}`);

  const inlineImages: { inlineData: { mimeType: string; data: string } }[] = [];
  // Use up to 3 most relevant screenshots to stay within token/latency budget
  const shotsToUse = opts.screenshots.slice(-3);
  for (const shotPath of shotsToUse) {
    if (fs.existsSync(shotPath)) {
      const data = fs.readFileSync(shotPath).toString("base64");
      inlineImages.push({ inlineData: { mimeType: "image/png", data } });
    }
  }

  const prompt = `
Você é o "olho" e a "mente" do usuário de teste na avaliação de usabilidade do TheoSphere (plataforma bíblica e teológica).
Você está encarnando a PERSONA:
- Nome: ${opts.persona.name} ${opts.persona.emoji}
- Perfil: ${opts.persona.profile}

TAREFA EXECUTADA:
- ID: ${opts.task.id}
- Título: ${opts.task.title}
- Critério de sucesso esperado: ${opts.task.success}

DADOS COLETADOS PELO SISTEMA (medição real do Playwright, não invente números):
- Duração: ${(opts.execution.ms / 1000).toFixed(1)}s
- Cliques efetuados: ${opts.execution.clicks}
- Passos: ${JSON.stringify(opts.execution.steps)}
- Checagens objetivas do sistema: ${JSON.stringify(opts.execution.checks)}
- Erros de console: ${JSON.stringify(opts.execution.consoleErrors)}
- Falhas de rede (4xx/5xx): ${JSON.stringify(opts.execution.netIssues)}

REGRAS RÍGIDAS ANTI-ALUCINAÇÃO (OBRIGATÓRIO):
1. Descreva APENAS o que está visível nas capturas de tela fornecidas. Se não houver evidência clara de algo, NÃO suponha. Se não puder verificar, registre "NÃO VERIFICADO".
2. Não invente nomes de botões, textos bíblicos, traduções ou menus que não aparecem nas imagens.
3. Se um botão falhou ou algo não carregou, aponte a imagem que comprova.
4. Narre a experiência em 1ª pessoa no tom e vocabulário exato da persona (${opts.persona.name}).
5. Extraia qualquer jargão técnico ou teológico confuso visível na tela que essa persona não entenderia (ex: RAG, Embeddings, Exegese, Link Set, termos em inglês).

RETORNE ESTRITAMENTE UM JSON VÁLIDO (sem markdown ao redor, sem \`\`\`json) com o seguinte esquema:
{
  "result": "✅" | "⚠️" | "❌" | "NÃO VERIFICADO",
  "ease": <número inteiro de 1 a 7, onde 1 é muito difícil/travei e 7 é extremamente fácil>,
  "reaction": "<uma frase curta e espontânea da persona resumindo o sentimento>",
  "narration": "<relato de 2 a 4 frases em 1ª pessoa do que tentou fazer e como foi>",
  "findings": [
    {
      "id": "<identificador único curto, ex: CIDA-FNT-01>",
      "title": "<título claro e específico do problema>",
      "screen": "<rota ou nome da tela onde ocorreu>",
      "type": "Bug" | "Navegação" | "Usabilidade" | "Acessibilidade" | "Performance" | "Conteúdo/Linguagem" | "Melhoria",
      "severity": "S1" | "S2" | "S3" | "S4" | "💡",
      "confidence": "Alta" | "Média" | "Baixa",
      "steps": ["passo 1", "passo 2"],
      "expected": "<o que a persona esperava>",
      "actual": "<o que de fato aconteceu na tela>",
      "evidence": "<nome ou descrição da captura de tela comprobatória>",
      "userQuote": "<fala da persona reclamando ou comentando>",
      "suggestion": "<sugestão do que mudar na tela em linguagem simples>"
    }
  ],
  "jargon": [
    {
      "term": "<palavra confusa encontrada>",
      "where": "<onde na tela>",
      "suggestion": "<termo mais acessível>"
    }
  ]
}
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }, ...inlineImages],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Gemini] HTTP ${res.status}: ${errText.slice(0, 150)}`);
      throw new Error(`Gemini status ${res.status}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
    const parsed = JSON.parse(rawText);
    const valid = TaskVerdictSchema.parse(parsed);
    return { verdict: valid, raw: rawText };
  } catch (err: any) {
    console.error(`[Gemini] Falha ao processar visão: ${err.message}`);
    // Safe fallback based on code checks
    const allChecksOk = opts.execution.checks.length > 0 && opts.execution.checks.every((c) => c.ok);
    const defaultVerdict: TaskVerdict = {
      result: allChecksOk ? "✅" : "⚠️",
      ease: allChecksOk ? 5 : 3,
      reaction: "Consegui avançar pelo fluxo principal.",
      narration: `Naveguei por ${opts.task.title} conforme o roteiro previsto.`,
      findings: [],
      jargon: [],
    };
    return { verdict: defaultVerdict, raw: String(err), usedFallback: true };
  }
}
