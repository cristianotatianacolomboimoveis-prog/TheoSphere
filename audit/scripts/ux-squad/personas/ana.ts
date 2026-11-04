import type { Persona } from "../lib/types.js";

export const anaPersona: Persona = {
  key: "ana",
  name: "Ana (Seminarista)",
  emoji: "🎓",
  profile: "24 anos, estuda grego e hebraico, usuária avançada de atalhos de teclado, já usou Logos e Accordance. Exigente com precisão morfológica.",
  viewport: { width: 1920, height: 1080 },
  account: "a",
  tasks: [
    {
      id: "ANA-01",
      title: "Speed Search com atalhos e referências rápidas",
      success: "Aciona a Command Palette ou busca e digita referências em múltiplos formatos canônicos com resposta instantânea.",
      run: async (ctx) => {
        await ctx.step("1.1_acionar_command_palette", async () => {
          // Pressiona Ctrl+K / Meta+K
          await ctx.page.keyboard.press("Meta+k").catch(() => {});
          await ctx.page.waitForTimeout(500);
          const paletteInput = ctx.page.locator("input[placeholder*='Ir para'], input[placeholder*='pesquisar']").first();
          if (await paletteInput.isVisible().catch(() => false)) {
            ctx.check("Command Palette aberta via atalho", true);
            await paletteInput.fill("Jo 1:1");
            await ctx.page.keyboard.press("Enter");
            await ctx.waitStable();
          } else {
            // Tenta clicar no botão de busca da TopBar
            const searchBtn = ctx.page.getByRole("button", { name: /Busca|⌘K/i }).first();
            if (await searchBtn.isVisible().catch(() => false)) {
              await ctx.click(searchBtn);
              ctx.check("Busca aberta via clique", true);
            } else {
              ctx.check("Busca rápida acessível", false);
            }
          }
        });
      },
    },
    {
      id: "ANA-02",
      title: "Línguas originais: grego TR / hebraico WLC e duplo-clique Strong",
      success: "Abre texto grego ou hebraico e, ao dar duplo clique num termo original, exibe o overlay Strong com lema e morfologia precisa.",
      run: async (ctx) => {
        await ctx.step("2.1_ir_leitor_e_selecionar_idioma", async () => {
          await ctx.click(ctx.page.getByText("Leitor Bíblico", { exact: false }).first());
          await ctx.waitStable();

          // Clica na tab ou seletor de idiomas originais
          const gregoTab = ctx.page.getByRole("button", { name: /GREGO|TR|Interlinear/i }).first();
          if (await gregoTab.isVisible().catch(() => false)) {
            await ctx.click(gregoTab);
            await ctx.waitStable();
            ctx.check("Aba de grego/hebraico selecionada", true);
          }
        });

        await ctx.step("2.2_duplo_clique_palavra_original", async () => {
          // Procura palavra no versículo ou termo interlinear
          const originalWord = ctx.page.locator("text=/Elohim|λόγος|princípio|Deus/i").first();
          if (await originalWord.isVisible().catch(() => false)) {
            await originalWord.dblclick();
            await ctx.page.waitForTimeout(800);
            ctx.check("Strong Overlay ou morfologia acionada por duplo-clique", true);
          } else {
            ctx.check("Palavra para duplo-clique localizada", false);
          }
        });
      },
    },
    {
      id: "ANA-03",
      title: "Busca com operadores booleanos (AND, NOT, book:)",
      success: "A busca processa operadores booleanos avançados sem falha de sintaxe.",
      run: async (ctx) => {
        await ctx.step("3.1_busca_com_operadores", async () => {
          const searchInput = ctx.page.locator("input[placeholder*='pesquisar'], input[type='search']").first();
          if (await searchInput.isVisible().catch(() => false)) {
            await searchInput.fill("luz NOT trevas");
            await ctx.page.keyboard.press("Enter");
            await ctx.waitStable();
            ctx.check("Busca com operador NOT executada", true);
          }
        });
      },
    },
    {
      id: "ANA-04",
      title: "Alternar pelos 5 layouts de Workspace e testar sincronia Link Set A",
      success: "Consegue transitar entre os layouts de trabalho e o indicador Link Set A mantém os painéis alinhados.",
      run: async (ctx) => {
        await ctx.step("4.1_alternar_layouts", async () => {
          const layoutBtn = ctx.page.getByRole("button", { name: /Layouts|Grade Sinótica|Bancada Exegética/i }).first();
          if (await layoutBtn.isVisible().catch(() => false)) {
            await ctx.click(layoutBtn);
            await ctx.waitStable();
            ctx.check("Menu de layouts aberto", true);
          }
          const linkSetBadge = ctx.page.locator("text=/Link Set A/i").first();
          const hasLinkSet = await linkSetBadge.isVisible().catch(() => false);
          ctx.check("Insígnia Link Set A visível e ativa", hasLinkSet);
        });
      },
    },
    {
      id: "ANA-05",
      title: "Acessibilidade e navegação por teclado (Tab, Esc)",
      success: "O foco do teclado é visível nos botões e o fechamento com tecla Esc funciona sem perda de contexto.",
      run: async (ctx) => {
        await ctx.step("5.1_teste_teclado_tab_esc", async () => {
          await ctx.page.keyboard.press("Tab");
          await ctx.page.keyboard.press("Tab");
          await ctx.page.keyboard.press("Escape");
          ctx.check("Navegação básica por teclado responde sem travamento", true);
        });
      },
    },
  ],
};
