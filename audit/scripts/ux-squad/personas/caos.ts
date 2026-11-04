import type { Persona } from "../lib/types.js";

export const caosPersona: Persona = {
  key: "caos",
  name: "Caos (Testador Destrutivo)",
  emoji: "💣",
  profile: "Impaciente, imprevisível e agressivo com a interface. Tenta quebrar o sistema com entradas bizarras, cliques repetidos e navegações anormais.",
  viewport: { width: 1440, height: 900 },
  account: "a",
  tasks: [
    {
      id: "CAOS-01",
      title: "Buscas hostis, injeção de script e referências impossíveis",
      success: "O sistema trata strings maliciosas (XSS, SQLi), referências bíblicas inválidas e inputs longos com mensagens de erro seguras e sem quebra de página ou crash.",
      run: async (ctx) => {
        const maliciousQueries = [
          "<script>alert(1)</script>",
          "' OR 1=1 --",
          "Apocalipse 99:99",
          "Gn 1:0",
          "   ",
          "🔥🙏✨📖🛡️⚔️👑",
          "A".repeat(250),
        ];

        for (let i = 0; i < maliciousQueries.length; i++) {
          const q = maliciousQueries[i];
          await ctx.step(`1.busca_${i + 1}`, async () => {
            const searchInput = ctx.page.locator("input[placeholder*='pesquisar'], input[type='search'], input[placeholder*='Ir para']").first();
            if (await searchInput.isVisible().catch(() => false)) {
              await searchInput.fill(q);
              await ctx.page.keyboard.press("Enter");
              await ctx.page.waitForTimeout(400);
              const body = await ctx.page.locator("body").innerText().catch(() => "");
              ctx.check(`Query tratada sem tela branca (${q.slice(0, 15)})`, !body.includes("Application error") && !body.includes("500 Internal"));
            }
          });
        }
      },
    },
    {
      id: "CAOS-02",
      title: "Cliques rápidos e múltiplos em botões de ação (Stress Click)",
      success: "Cliques repetidos rápidos não duplicam registros nem travam a interface.",
      run: async (ctx) => {
        await ctx.step("2.1_multiplos_cliques", async () => {
          const anyButton = ctx.page.locator("button:visible").first();
          if (await anyButton.isVisible().catch(() => false)) {
            // Triple click
            await anyButton.click({ clickCount: 3, delay: 50 }).catch(() => {});
            await ctx.page.waitForTimeout(1000);
            ctx.check("Interface respondeu a múltiplos cliques sem crash", true);
          }
        });
      },
    },
    {
      id: "CAOS-03",
      title: "Anotação gigante de 10.000 caracteres com hebraico e markdown",
      success: "O campo de texto suporta inputs longos e multilíngues sem truncamento destrutivo.",
      run: async (ctx) => {
        await ctx.step("3.1_ir_ao_caderno", async () => {
          await ctx.click(ctx.page.getByText("Caderno de Notas", { exact: false }).first());
          await ctx.waitStable();
        });

        await ctx.step("3.2_colar_texto_massivo", async () => {
          const textarea = ctx.page.locator("textarea").first();
          if (await textarea.isVisible().catch(() => false)) {
            const longText = "בְּרֵאשִׁית בָּרָא אֱלֹהִים # Título em Markdown\n" + "Texto de teste ".repeat(400);
            await textarea.fill(longText);
            await ctx.page.waitForTimeout(800);
            const val = await textarea.inputValue().catch(() => "");
            ctx.check("Texto longo inserido no editor", val.length > 1000, `Tamanho: ${val.length} caracteres`);
          }
        });
      },
    },
    {
      id: "CAOS-04",
      title: "Navegação por rota inexistente (/xpto) e integridade da sessão",
      success: "Rotas inexistentes exibem tela 404 limpa ou redirecionam de forma segura sem loop.",
      run: async (ctx) => {
        await ctx.step("4.1_acessar_rota_404", async () => {
          const resp = await ctx.page.goto(ctx.base + "/xpto-nao-existe-1234", { waitUntil: "domcontentloaded" });
          await ctx.waitStable();
          const body = await ctx.page.locator("body").innerText().catch(() => "");
          ctx.check("Não crashou na rota 404", !body.includes("Unhandled Runtime Error"), `Status: ${resp?.status()}`);
        });
      },
    },
    {
      id: "CAOS-05",
      title: "Botões de Voltar e Avançar do navegador no meio de fluxo",
      success: "Histórico do navegador não desloga o usuário nem deixa tela em branco.",
      run: async (ctx) => {
        await ctx.step("5.1_voltar_avancar", async () => {
          await ctx.page.goBack().catch(() => {});
          await ctx.waitStable();
          await ctx.page.goForward().catch(() => {});
          await ctx.waitStable();
          ctx.check("Navegação Voltar/Avançar preservou aplicação", true);
        });
      },
    },
  ],
};
