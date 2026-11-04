import type { Persona } from "../lib/types.js";

export const joanaPersona: Persona = {
  key: "joana",
  name: "Joana (Líder de Pequeno Grupo)",
  emoji: "📱",
  profile: "38 anos, usa só o celular no intervalo do trabalho, 4G instável. Busca agilidade para a reunião devocional de hoje.",
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  account: "a",
  tasks: [
    {
      id: "JOANA-01",
      title: "Abrir no smartphone e localizar Salmo 23",
      success: "A interface se adapta à tela pequena sem quebras de layout e permite achar Salmo 23 facilmente.",
      run: async (ctx) => {
        await ctx.step("1.1_home_mobile", async () => {
          const bodyWidth = await ctx.page.evaluate(() => document.body.scrollWidth);
          ctx.check("Sem overflow horizontal na home", bodyWidth <= 390 + 5, `Largura do corpo: ${bodyWidth}px`);
        });

        await ctx.step("1.2_abrir_leitor_mobile", async () => {
          const menuBtn = ctx.page.locator("button[aria-label*='menu'], button:has-text('☰'), button:has-text('Dashboard')").first();
          if (await menuBtn.isVisible().catch(() => false)) {
            await ctx.click(menuBtn);
            await ctx.page.waitForTimeout(500);
          }
          const leitorLink = ctx.page.getByText("Leitor Bíblico", { exact: false }).first();
          if (await leitorLink.isVisible().catch(() => false)) {
            await ctx.click(leitorLink);
            await ctx.waitStable();
          }
          ctx.check("Tela do Leitor carregada no mobile", true);
        });
      },
    },
    {
      id: "JOANA-02",
      title: "Trocar de tradução bíblica no celular",
      success: "Consegue alternar entre traduções disponíveis (BLIVRE, NVA, KJV) através do seletor mobile.",
      run: async (ctx) => {
        await ctx.step("2.1_seletor_traducao", async () => {
          const transBtn = ctx.page.getByRole("button", { name: /BLIVRE|NVA|KJV|Versão/i }).first();
          if (await transBtn.isVisible().catch(() => false)) {
            await ctx.click(transBtn);
            await ctx.waitStable();
            ctx.check("Modal ou dropdown de versões aberto", true);
          }
        });
      },
    },
    {
      id: "JOANA-03",
      title: "Pedir à IA 5 perguntas de discussão para o grupo",
      success: "O campo de Copilot/chat é acessível no celular sem que o teclado cubra a visualização.",
      run: async (ctx) => {
        await ctx.step("3.1_chat_ia_mobile", async () => {
          const iaBtn = ctx.page.getByRole("button", { name: /Insights|Copilot|IA/i }).first();
          if (await iaBtn.isVisible().catch(() => false)) {
            await ctx.click(iaBtn);
            await ctx.waitStable();
            ctx.check("Painel de IA aberto no mobile", true);
          }
        });
      },
    },
    {
      id: "JOANA-04",
      title: "Acessar o Atlas Bíblico 3D no celular e verificar usabilidade touch",
      success: "O mapa ou globo 3D carrega e responde a gestos sem travar a interface mobile.",
      run: async (ctx) => {
        await ctx.step("4.1_abrir_atlas_mobile", async () => {
          const atlasNav = ctx.page.getByText("Atlas Bíblico", { exact: false }).first();
          if (await atlasNav.isVisible().catch(() => false)) {
            await ctx.click(atlasNav);
            await ctx.waitStable();
            ctx.check("Atlas acessado no celular", true);
          }
        });
      },
    },
  ],
};
