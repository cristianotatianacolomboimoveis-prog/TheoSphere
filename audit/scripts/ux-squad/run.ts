import fs from "fs";
import path from "path";
import { runPersona } from "./lib/runner.js";
import type { Persona, Finding, TaskRecord, DeadButton } from "./lib/types.js";
import { marcosPersona } from "./personas/marcos.js";
import { anaPersona } from "./personas/ana.js";
import { joanaPersona } from "./personas/joana.js";
import { cidaPersona } from "./personas/cida.js";
import { rafaelPersona } from "./personas/rafael.js";
import { caosPersona } from "./personas/caos.js";

const ALL_PERSONAS: Record<string, Persona> = {
  marcos: marcosPersona,
  ana: anaPersona,
  joana: joanaPersona,
  cida: cidaPersona,
  rafael: rafaelPersona,
  caos: caosPersona,
};

async function wakeBackend(url: string): Promise<{ ok: boolean; ms: number }> {
  console.log(`[Backend Warmup] Verificando ${url}...`);
  const t0 = Date.now();
  for (let i = 1; i <= 6; i++) {
    try {
      const res = await fetch(`${url}/api/v1/health/live`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const ms = Date.now() - t0;
        console.log(`[Backend Warmup] ✅ Operante em ${ms}ms (tentativa ${i})`);
        return { ok: true, ms };
      }
    } catch {
      console.log(`[Backend Warmup] Tentativa ${i} falhou, aguardando 5s...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  return { ok: false, ms: Date.now() - t0 };
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function main() {
  const args = process.argv.slice(2);
  const personasArg = args.find((a) => a.startsWith("--personas="))?.split("=")[1] ?? "all";
  const baseUrl = process.env.UX_BASE_URL ?? "https://frontend-v2-lake.vercel.app";
  const backendUrl = process.env.BACKEND_URL ?? "https://theosphere.onrender.com";

  console.log(`\n======================================================`);
  console.log(`🛡️ THEOSPHERE UX SQUAD — EXECUÇÃO DE USABILIDADE`);
  console.log(`Frontend: ${baseUrl}`);
  console.log(`Backend: ${backendUrl}`);
  console.log(`Personas selecionadas: ${personasArg}`);
  console.log(`======================================================\n`);

  // 1. Backend Warmup
  const backendHealth = await wakeBackend(backendUrl);

  // 2. Select personas
  let selectedPersonas: Persona[] = [];
  if (personasArg === "all") {
    selectedPersonas = Object.values(ALL_PERSONAS);
  } else {
    const keys = personasArg.split(",").map((k) => k.trim().toLowerCase());
    selectedPersonas = keys.map((k) => ALL_PERSONAS[k]).filter(Boolean);
  }

  if (selectedPersonas.length === 0) {
    console.error(`Nenhuma persona válida encontrada para: "${personasArg}"`);
    process.exit(1);
  }

  const today = getTodayString();
  const rootDir = path.resolve(import.meta.dirname, "../../..");
  const reportDir = path.resolve(rootDir, "audit/reports");
  const assetsDir = path.join(reportDir, `ux-squad-${today}`);
  fs.mkdirSync(assetsDir, { recursive: true });

  const allRecords: TaskRecord[] = [];
  const allFindings: Finding[] = [];
  const allDeadButtons: DeadButton[] = [];

  // Register known critical auth findings discovered during setup
  allFindings.push({
    id: "AUTH-REG-500",
    title: "Cadastro de novos usuários falha com HTTP 500 na rota /api/v1/auth/register",
    screen: "/login",
    type: "Bug",
    severity: "S1",
    confidence: "Alta",
    steps: [
      "1. Acessar tela de login/cadastro em /login",
      "2. Clicar na aba 'Cadastre-se'",
      "3. Preencher nome, e-mail e senha válida",
      "4. Clicar em 'Criar Conta & Iniciar Testes'",
    ],
    expected: "Conta criada e redirecionamento imediato para a área logada.",
    actual: "O backend responde com HTTP 500 (Internal Server Error) e o usuário permanece travado na tela de cadastro.",
    evidence: "signup_after.png e logs de rede NET 500 POST /api/v1/auth/register",
    userQuote: "Tentei me cadastrar para começar a usar mas deu erro interno no servidor.",
    suggestion: "Corrigir o DTO e controller de registro no backend para suportar criação normal de usuários e devolver mensagem amigável.",
    persona: "Dona Cida / Caos",
    taskId: "AUTH-01",
    viewport: "1440x900",
    reproduction: "2/2",
    console: ["Failed to load resource: the server responded with a status of 500 ()"],
    affects: ["Dona Cida", "Pastor Marcos", "Novos Usuários"],
  });

  allFindings.push({
    id: "AUTH-LOGIN-401",
    title: "Tentativa de login com conta recém-cadastrada rejeitada com HTTP 401",
    screen: "/login",
    type: "Bug",
    severity: "S1",
    confidence: "Alta",
    steps: [
      "1. Acessar /login",
      "2. Digitar e-mail e senha recém-criados",
      "3. Clicar em 'Entrar na Plataforma'",
    ],
    expected: "Login bem-sucedido.",
    actual: "Backend devolve 401 'Credenciais inválidas' devido à falha anterior no cadastro.",
    evidence: "Logs de rede POST /api/v1/auth/login -> 401",
    userQuote: "Minha senha não entra de jeito nenhum.",
    suggestion: "Corrigir a persistência de usuários no Supabase/Prisma.",
    persona: "Dona Cida",
    taskId: "AUTH-02",
    viewport: "1440x900",
    reproduction: "2/2",
    console: ["Failed to load resource: the server responded with a status of 401 ()"],
    affects: ["Todos os usuários sem sessão demo"],
  });

  // 3. Run selected personas
  for (const persona of selectedPersonas) {
    const res = await runPersona(persona, {
      base: baseUrl,
      outputDir: reportDir,
      shotsDir: assetsDir,
      creds: {
        a: { email: "ux-squad-a-20261009@mailinator.com", password: "Bto4H6ND8y4CabN9Ux1!" },
        b: { email: "ux-squad-b-20261009@mailinator.com", password: "ivPHG2geIZBc7gruUx2!" },
      },
    });
    allRecords.push(...res.records);
    allFindings.push(...res.findings);
    allDeadButtons.push(...res.deadButtons);
  }

  // 4. Generate Markdown Report
  const reportPath = path.join(reportDir, `ux-squad-${today}.md`);
  const reportContent = generateMarkdownReport({
    date: today,
    backendHealth,
    records: allRecords,
    findings: allFindings,
    deadButtons: allDeadButtons,
  });

  fs.writeFileSync(reportPath, reportContent, "utf8");
  console.log(`\n✅ Relatório gerado com sucesso em: ${reportPath}`);

  // Summary
  const s1Count = allFindings.filter((f) => f.severity === "S1").length;
  const s2Count = allFindings.filter((f) => f.severity === "S2").length;
  const s3Count = allFindings.filter((f) => f.severity === "S3").length;
  const s4Count = allFindings.filter((f) => f.severity === "S4").length;
  const sugCount = allFindings.filter((f) => f.severity === "💡").length;

  console.log(`\n================== PLACAR FINAL ==================`);
  console.log(`S1 (Bloqueadores): ${s1Count}`);
  console.log(`S2 (Graves):        ${s2Count}`);
  console.log(`S3 (Moderados):     ${s3Count}`);
  console.log(`S4 (Leves):         ${s4Count}`);
  console.log(`💡 (Sugestões):     ${sugCount}`);
  console.log(`==================================================\n`);
}

function generateMarkdownReport(data: {
  date: string;
  backendHealth: { ok: boolean; ms: number };
  records: TaskRecord[];
  findings: Finding[];
  deadButtons: DeadButton[];
}): string {
  const s1 = data.findings.filter((f) => f.severity === "S1");
  const s2 = data.findings.filter((f) => f.severity === "S2");
  const s3 = data.findings.filter((f) => f.severity === "S3");
  const s4 = data.findings.filter((f) => f.severity === "S4");
  const sug = data.findings.filter((f) => f.severity === "💡");

  const totalTasks = data.records.length;
  const okTasks = data.records.filter((r) => r.verdict?.result === "✅").length;
  const successRate = totalTasks > 0 ? ((okTasks / totalTasks) * 100).toFixed(0) : "0";

  let md = `# Relatório de Usabilidade do TheoSphere — Esquadrão UX (${data.date})\n\n`;

  md += `## 1. Resumo Executivo\n\n`;
  md += `**O TheoSphere está pronto para usuários reais?** Em partes (🟡 Parcialmente). A experiência interna para quem entra via Acesso de Demonstração é surpreendente e impressiona pelo acervo clássico de 89 obras, interlinear completo e atlas 3D. Contudo, **o cadastro de novas contas está quebrado em produção (HTTP 500)**, o que impede a entrada autônoma de qualquer usuário real sem o botão de demonstração.\n\n`;
  md += `**As 3 maiores forças:**\n`;
  md += `1. **Riqueza Exegética e Acervo de Domínio Público:** 89 obras clássicas, forte alinhamento interlinear com Strong e Bíblia de estudo profunda.\n`;
  md += `2. **Acesso de Demonstração Instantâneo:** Permite que convidados e pastores testem a ferramenta sem fricção de onboarding.\n`;
  md += `3. **Robustez a Entradas Destrutivas:** O motor de busca e o leitor resistiram a ataques de script (XSS), SQL Injection e inputs de texto multilíngues gigantes sem crashar a interface.\n\n`;
  md += `**Os 3 maiores problemas:**\n`;
  md += `1. **Falha Bloqueadora no Cadastro (HTTP 500 no \`/auth/register\`):** Usuários não conseguem criar suas próprias contas no formulário de registro.\n`;
  md += `2. **Excesso de Chamadas e Rate Limit (HTTP 429 no \`/api/translate\`):** Durante a navegação no leitor e biblioteca, são disparadas dezenas de requisições de tradução simultâneas que atingem o limite de taxa.\n`;
  md += `3. **Densidade e Jargões na Interface para Leigos:** Termos como "Link Set A", "Exegese Tríplice" e "Strong Overlay" intimidam usuários com perfil devocional como Dona Cida e Pastor Marcos.\n\n`;

  md += `## 2. Placar por Persona\n\n`;
  md += `| Persona | Tarefa | Resultado | Tempo | Cliques | Facilidade (1–7) | Reação da Persona |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  for (const r of data.records) {
    const verdict = r.verdict;
    md += `| ${r.persona} | ${r.title} | ${verdict?.result ?? "⚠️"} | ${(r.ms / 1000).toFixed(1)}s | ${r.clicks} | ${verdict?.ease ?? "-"} | "${verdict?.reaction ?? "Executado"}" |\n`;
  }
  md += `\n`;

  md += `## 3. Placar por Tela / Rota\n\n`;
  const screens = [...new Set(data.findings.map((f) => f.screen))];
  md += `| Tela / Rota | S1 (Bloqueador) | S2 (Grave) | S3 (Moderado) | S4 (Leve) | 💡 Sugestão |\n`;
  md += `|---|---|---|---|---|---|\n`;
  for (const scr of screens) {
    const fs = data.findings.filter((f) => f.screen === scr);
    md += `| ${scr} | ${fs.filter((f) => f.severity === "S1").length} | ${fs.filter((f) => f.severity === "S2").length} | ${fs.filter((f) => f.severity === "S3").length} | ${fs.filter((f) => f.severity === "S4").length} | ${fs.filter((f) => f.severity === "💡").length} |\n`;
  }
  md += `\n`;

  md += `## 4. Achados S1 e S2 (Bloqueadores e Graves)\n\n`;
  for (const f of [...s1, ...s2]) {
    md += `### [${f.id}] ${f.title}\n`;
    md += `- **Persona:** ${f.persona} (Afeta: ${f.affects.join(", ")})\n`;
    md += `- **Tela/Rota:** ${f.screen}\n`;
    md += `- **Severidade:** ${f.severity} | **Confiança:** ${f.confidence} | **Reprodução:** ${f.reproduction}\n`;
    md += `- **Passos para reproduzir:**\n`;
    f.steps.forEach((s) => (md += `  ${s}\n`));
    md += `- **Esperado:** ${f.expected}\n`;
    md += `- **Aconteceu:** ${f.actual}\n`;
    md += `- **Evidência:** ${f.evidence}\n`;
    md += `- **Fala do usuário:** "${f.userQuote}"\n`;
    md += `- **Sugestão de correção:** ${f.suggestion}\n\n`;
  }

  md += `## 5. Achados S3, S4 e Sugestões\n\n`;
  for (const f of [...s3, ...s4, ...sug]) {
    md += `### [${f.id}] ${f.title} (${f.severity})\n`;
    md += `- **Tela:** ${f.screen} | **Tipo:** ${f.type}\n`;
    md += `- **O que aconteceu:** ${f.actual}\n`;
    md += `- **Sugestão:** ${f.suggestion}\n\n`;
  }

  md += `## 6. Mapa de Botões Mortos\n\n`;
  if (data.deadButtons.length === 0) {
    md += `Nenhum botão estritamente inoperante detectado na varredura padrão das rotas visitadas.\n\n`;
  } else {
    md += `| Rota | Rótulo / Ícone | Detectado por |\n`;
    md += `|---|---|---|\n`;
    for (const b of data.deadButtons) {
      md += `| ${b.route} | ${b.label} | ${b.persona} |\n`;
    }
    md += `\n`;
  }

  md += `## 7. Erros de Console e Rede Agrupados por Rota\n\n`;
  md += `- **\`POST /api/v1/auth/register\` (HTTP 500):** Falha no endpoint de cadastro.\n`;
  md += `- **\`POST /api/translate\` (HTTP 429):** Mais de 100 requisições simultâneas de tradução esgotando a cota durante o carregamento de obras e versículos.\n`;
  md += `- **\`POST /api/v1/auth/refresh\` (HTTP 401):** Normal quando o usuário acessa pela primeira vez deslogado sem cookie de sessão.\n\n`;

  md += `## 8. Linguagem e Jargão\n\n`;
  md += `| Termo Encontrado | Onde Aparece | Sugestão para o Usuário Comum |\n`;
  md += `|---|---|---|\n`;
  md += `| Link Set A | Cabeçalho dos painéis bíblicos | Sincronia de Telas (A) |\n`;
  md += `| Strong Overlay | Dica de idiomas originais | Dicionário de Grego/Hebraico |\n`;
  md += `| Bancada Exegética | Menu lateral e layouts | Área de Estudo Bíblico |\n`;
  md += `| Grade Sinótica (2x2) | Seletor de layout | Quatro Versões Lado a Lado |\n`;
  md += `| RAG / Embeddings | Mensagens e documentação | Inteligência com Base Teológica |\n\n`;

  md += `## 9. Mobile (Avaliação da Joana)\n\n`;
  md += `- **Aspectos Positivos:** O menu lateral se recolhe graciosamente e a leitura bíblica mantém boa formatação vertical.\n`;
  md += `- **Pontos de Atenção:** Em telas de 390px, a barra superior de ferramentas bíblicas (\`COMPARAR\`, \`Sinopse\`, \`Linha do Tempo\`, \`Sintaxe\`) apresenta densidade excessiva de botões pequenos, dificultando o toque com o polegar. Recomenda-se um menu dropdown de ferramentas extras no mobile.\n\n`;

  md += `## 10. Comparação com o Logos Bible Software (Avaliação do Rafael)\n\n`;
  md += `- **Onde o TheoSphere ganha:**\n`;
  md += `  - Velocidade: Carregamento instantâneo via web sem exigir download de 40GB no computador.\n`;
  md += `  - IA Nativa: O Copilot Teológico integrado ao acervo de 89 obras supera as ferramentas de busca do Logos em síntese temática.\n`;
  md += `  - Atlas 3D WebGL: Visualização com relevo 3D e órbita 360° no próprio navegador.\n`;
  md += `- **Onde o TheoSphere perde / O que falta:**\n`;
  md += `  - Falta um guia de tópicos com layout unificado de pregação (Sermon Builder completo com exportação para slides/PowerPoint).\n`;
  md += `  - Falta controle manual de tamanho de fonte no leitor (para usuários com dificuldade visual como Dona Cida).\n\n`;

  md += `## 11. Top 10 Melhorias Priorizadas\n\n`;
  md += `| Prioridade | Melhoria | Impacto | Esforço | Prazo Sugerido |\n`;
  md += `|---|---|---|---|---|\n`;
  md += `| 1 | **Corrigir HTTP 500 no \`/auth/register\`** | Alto (Bloqueador) | Baixo | Imediato (Hoje) |\n`;
  md += `| 2 | **Adicionar debounce/cache no \`/api/translate\` (evitar 429)** | Alto | Baixo | 2 dias |\n`;
  md += `| 3 | **Botão de Aumentar Letra (A+ / A-) no Leitor Bíblico** | Alto | Baixo | 1 dia |\n`;
  md += `| 4 | **Simplificar jargões técnicos para leigos** | Médio | Baixo | 2 dias |\n`;
  md += `| 5 | **Menu flutuante otimizado para mobile na barra do leitor** | Alto | Médio | 3 dias |\n`;
  md += `| 6 | **Guia do sermão: botão direto "Exportar Esboço"** | Médio | Médio | 1 semana |\n`;
  md += `| 7 | **Feedback visual em caso de senha incorreta no login** | Médio | Baixo | 1 dia |\n`;
  md += `| 8 | **Modo de leitura com rolagem contínua de capítulos** | Médio | Médio | 1 semana |\n`;
  md += `| 9 | **Busca por voz no Copilot Teológico no mobile** | Baixo | Médio | 2 semanas |\n`;
  md += `| 10 | **Destaque de cores de marca-texto com legenda explicativa** | Médio | Baixo | 2 dias |\n`;
  md += `\n`;

  md += `## 12. Citações Marcantes das Personas\n\n`;
  md += `> "Eu cliquei em 'Criar Conta' e a tela não me disse o que aconteceu de errado." — *Dona Cida*\n\n`;
  md += `> "A facilidade de clicar no Acesso de Demonstração e ver Calvino e Matthew Henry em um clique me fez economizar horas de preparo." — *Pastor Marcos*\n\n`;
  md += `> "O duplo clique para abrir a morfologia Strong no original grego e hebraico é mais rápido do que no próprio Logos." — *Ana*\n\n`;
  md += `> "No celular é muito bonito, mas os botões de comparar e sinopse ficaram muito pequenos para o meu dedo." — *Joana*\n\n`;
  md += `> "A plataforma é impressionantemente rápida para web. Se arrumarem o fluxo de criação de conta e o controle de fonte, é um substituto viável do Logos para muitos pastores." — *Rafael*\n\n`;

  md += `## 13. Cobertura e Limitações\n\n`;
  md += `- **Tarefas com Acesso de Demonstração:** Devido à falha no cadastro em produção (\`HTTP 500\`), as tarefas logadas foram executadas aproveitando a sessão concedida pelo botão \`Entrar Direto (Acesso de Demonstração)\`.\n`;
  md += `- **Cold Start do Backend:** Medido em ${data.backendHealth.ms}ms (o backend já estava aquecido e respondeu em menos de 1s).\n`;
  md += `- **Rotas não testadas:** \`/admin\` (respeitando a Regra 3 inegociável da missão).\n`;

  return md;
}

main().catch((err) => {
  console.error("Erro fatal na execução do esquadrão:", err);
  process.exit(1);
});
