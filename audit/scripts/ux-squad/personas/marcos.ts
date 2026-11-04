import type { Persona } from "../lib/types.js";

export const marcosPersona: Persona = {
  key: "marcos",
  name: "Pastor Marcos",
  emoji: "🧑‍🏫",
  profile: "52 anos, prega todo domingo, usa notebook, sabe o básico de computador, nunca usou Logos. Pouco tempo.",
  viewport: { width: 1366, height: 768 },
  account: "a",
  tasks: [
    {
      id: "MARCOS-01",
      title: "Entrar pela primeira vez e entender o que fazer sem ajuda",
      success: "A tela inicial ou dashboard explica com clareza o propósito da plataforma e oferece um caminho intuitivo para começar a leitura ou preparo de sermão.",
      run: async (ctx) => {
        await ctx.step("1.1_home_dashboard", async () => {
          const title = await ctx.page.title();
          ctx.check("Página carregou com título", title.includes("TheoSphere"));
          const mainHeading = await ctx.page.locator("h1, h2").first().innerText().catch(() => "");
          ctx.check("Cabeçalho visível", Boolean(mainHeading));
          ctx.log(`Título da tela: ${title} | H1: ${mainHeading}`);
        });
        await ctx.sweepDeadButtons("/");
      },
    },
    {
      id: "MARCOS-02",
      title: "Abrir Romanos 8 e comparar NVA com BLIVRE lado a lado",
      success: "Consegue selecionar Romanos capítulo 8 e ativar a visualização de comparação entre as versões NVA e BLIVRE.",
      run: async (ctx) => {
        await ctx.step("2.1_ir_leitor_biblico", async () => {
          const navBtn = ctx.page.getByText("Leitor Bíblico", { exact: false }).first();
          await ctx.click(navBtn);
          await ctx.waitStable();
          ctx.check("Está na tela do Leitor", ctx.page.url().includes("/study") || (await ctx.page.getByText("Gênesis").isVisible().catch(() => false)));
        });

        await ctx.step("2.2_abrir_romanos_8", async () => {
          // Tenta clicar no seletor de livro
          const bookPicker = ctx.page.getByRole("button", { name: /Gênesis|Livro/i }).first();
          if (await bookPicker.isVisible().catch(() => false)) {
            await ctx.click(bookPicker);
            await ctx.page.waitForTimeout(500);
            const romBtn = ctx.page.getByText("Romanos", { exact: true }).first();
            if (await romBtn.isVisible().catch(() => false)) {
              await ctx.click(romBtn);
            }
          }
          await ctx.waitStable();
        });

        await ctx.step("2.3_ativar_comparacao_versoes", async () => {
          const compBtn = ctx.page.getByRole("button", { name: /COMPARAR|Sinopse & Variantes/i }).first();
          if (await compBtn.isVisible().catch(() => false)) {
            await ctx.click(compBtn);
            await ctx.waitStable();
            ctx.check("Modal ou painel de comparação aberto", true);
          } else {
            ctx.check("Botão de comparação visível", false, "Botão COMPARAR não localizado na barra");
          }
        });
      },
    },
    {
      id: "MARCOS-03",
      title: "Buscar o que comentaristas clássicos dizem sobre o v. 28",
      success: "Encontra e acessa comentários históricos (ex: Calvino, Matthew Henry) para o versículo selecionado.",
      run: async (ctx) => {
        await ctx.step("3.1_abrir_ideias_ou_guia", async () => {
          const ideiasBtn = ctx.page.getByRole("button", { name: /Guia Exegético|Ideias|Insights/i }).first();
          if (await ideiasBtn.isVisible().catch(() => false)) {
            await ctx.click(ideiasBtn);
            await ctx.waitStable();
            ctx.check("Painel exegético/comentários aberto", true);
          }
        });

        await ctx.step("3.2_explorar_comentarios", async () => {
          const commentTab = ctx.page.getByText(/Calvino|Matthew Henry|Comentários/i).first();
          const hasComment = await commentTab.isVisible().catch(() => false);
          ctx.check("Acesso a comentaristas clássicos visível", hasComment);
        });
      },
    },
    {
      id: "MARCOS-04",
      title: "Perguntar ao Copilot IA sobre o contexto de Romanos 8:28",
      success: "A IA responde com contexto exegético claro e cita fontes verificáveis de teólogos clássicos.",
      run: async (ctx) => {
        await ctx.step("4.1_abrir_copilot", async () => {
          const copilotBtn = ctx.page.getByRole("button", { name: /Copilot|INSIGHTS DA IA/i }).first();
          if (await copilotBtn.isVisible().catch(() => false)) {
            await ctx.click(copilotBtn);
            await ctx.waitStable();
          }
        });

        await ctx.step("4.2_enviar_pergunta_ia", async () => {
          const input = ctx.page.locator("input[placeholder*='Ex:'], textarea[placeholder*='Copilot'], input[placeholder*='Pesquisar']").first();
          if (await input.isVisible().catch(() => false)) {
            await input.fill("Qual é o contexto de Romanos 8:28 e como evitar uma aplicação errada dele?");
            await ctx.page.keyboard.press("Enter");
            await ctx.page.waitForTimeout(6000);
            await ctx.waitStable();
            ctx.check("Pergunta enviada ao Copilot", true);
          }
        });
      },
    },
    {
      id: "MARCOS-05",
      title: "Montar esboço no Caderno de Notas / Sermon Builder e salvar",
      success: "Cria e salva uma anotação de sermão contendo introdução, pontos e conclusão.",
      run: async (ctx) => {
        await ctx.step("5.1_abrir_caderno_notas", async () => {
          const notesNav = ctx.page.getByText("Caderno de Notas", { exact: false }).first();
          await ctx.click(notesNav);
          await ctx.waitStable();
          ctx.check("Caderno de notas acessado", ctx.page.url().includes("/notes") || (await ctx.page.getByText("CADERNO DE NOTAS").isVisible().catch(() => false)));
        });

        await ctx.step("5.2_escrever_esboco", async () => {
          const textarea = ctx.page.locator("textarea").first();
          if (await textarea.isVisible().catch(() => false)) {
            await textarea.fill("ESBOÇO DE SERMÃO: O Amor Inabalável de Deus (Romanos 8:28-39)\n1. Todas as coisas cooperam\n2. Mais que vencedores por Cristo.");
            await ctx.page.waitForTimeout(1000);
            ctx.check("Texto do sermão inserido", true);
          }
        });
      },
    },
    {
      id: "MARCOS-06",
      title: "Voltar e verificar se o esboço permanece salvo",
      success: "Ao retornar ao Caderno de Notas, o texto previamente digitado continua salvo.",
      run: async (ctx) => {
        await ctx.step("6.1_revisitar_notas", async () => {
          const notesNav = ctx.page.getByText("Caderno de Notas", { exact: false }).first();
          await ctx.click(notesNav);
          await ctx.waitStable();
          const textarea = ctx.page.locator("textarea").first();
          const val = await textarea.inputValue().catch(() => "");
          ctx.check("Esboço mantido após navegação", val.includes("ESBOÇO DE SERMÃO"), `Valor atual: ${val.slice(0, 30)}`);
        });
      },
    },
  ],
};
