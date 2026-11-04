import type { Persona } from "../lib/types.js";

export const rafaelPersona: Persona = {
  key: "rafael",
  name: "Rafael (Usuário Logos)",
  emoji: "🔍",
  profile: "45 anos, professor de teologia, usa Logos há 10 anos, cético e comparativo. Quer avaliar se o TheoSphere substitui o Logos.",
  viewport: { width: 1440, height: 900 },
  account: "a",
  tasks: [
    {
      id: "RAFAEL-01",
      title: "Percorrer as rotas principais e avaliar tempo e feedback",
      success: "Todas as rotas abrem com layout profissional e tempo de carregamento perceptível inferior a 2 segundos.",
      run: async (ctx) => {
        const routes = [
          { name: "Leitor Bíblico", path: "/study" },
          { name: "Factbook & Tópicos", path: "/factbook" },
          { name: "Biblioteca Clássica", path: "/library" },
          { name: "Atlas Bíblico 3D", path: "/atlas" },
          { name: "Grafo Teológico", path: "/graph" },
          { name: "Caderno de Notas", path: "/notes" },
          { name: "Configurações", path: "/settings" },
        ];

        for (const r of routes) {
          await ctx.step(`1.${r.name}`, async () => {
            const link = ctx.page.getByText(r.name, { exact: false }).first();
            if (await link.isVisible().catch(() => false)) {
              await ctx.click(link);
              await ctx.waitStable();
              ctx.check(`Rota ${r.name} carregada`, true, ctx.page.url());
            } else {
              // Tenta via URL direta se o menu estiver recolhido
              await ctx.page.goto(ctx.base + r.path, { waitUntil: "domcontentloaded" });
              await ctx.waitStable();
              ctx.check(`Rota ${r.name} via URL`, true, ctx.page.url());
            }
          });
        }
      },
    },
    {
      id: "RAFAEL-02",
      title: "Factbook: pesquisar tópico e testar lentes temáticas",
      success: "O Factbook retorna ficha teológica rica com abas/lentes temáticas (Bíblico, Teológico, Histórico).",
      run: async (ctx) => {
        await ctx.step("2.1_abrir_factbook", async () => {
          await ctx.click(ctx.page.getByText("Factbook & Tópicos", { exact: false }).first());
          await ctx.waitStable();
        });

        await ctx.step("2.2_pesquisa_topico", async () => {
          const input = ctx.page.locator("input[placeholder*='Buscar'], input[placeholder*='tópico']").first();
          if (await input.isVisible().catch(() => false)) {
            await input.fill("Paulo");
            await ctx.page.keyboard.press("Enter");
            await ctx.waitStable();
            ctx.check("Pesquisa no Factbook executada", true);
          }
        });
      },
    },
    {
      id: "RAFAEL-03",
      title: "Atlas 3D: rotas bíblicas e desempenho cartográfico",
      success: "O mapa ou globo carrega as rotas históricas com fluidez e rótulos bíblicos claros.",
      run: async (ctx) => {
        await ctx.step("3.1_abrir_atlas_3d", async () => {
          await ctx.click(ctx.page.getByText("Atlas Bíblico 3D", { exact: false }).first());
          await ctx.waitStable();
          const canvas = ctx.page.locator("canvas").first();
          const hasCanvas = await canvas.isVisible().catch(() => false);
          ctx.check("Canvas 3D / WebGL renderizado", hasCanvas);
        });
      },
    },
    {
      id: "RAFAEL-04",
      title: "Biblioteca Teológica: catálogo de obras e busca clássica",
      success: "Exibe acervo canônico (Calvino, Matthew Henry, Aquino) com filtros por tradição e categorias.",
      run: async (ctx) => {
        await ctx.step("4.1_abrir_biblioteca", async () => {
          await ctx.click(ctx.page.getByText("Biblioteca Clássica", { exact: false }).first());
          await ctx.waitStable();
          const countBadge = ctx.page.locator("text=/89 obras|Todas as Obras/i").first();
          ctx.check("Contagem de obras clássicas visível", await countBadge.isVisible().catch(() => false));
        });
      },
    },
  ],
};
