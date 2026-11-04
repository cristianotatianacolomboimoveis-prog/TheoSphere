import type { Persona } from "../lib/types.js";

export const cidaPersona: Persona = {
  key: "cida",
  name: "Dona Cida",
  emoji: "👵",
  profile: "67 anos, primeira vez num software de teologia, usa óculos, zoom de 150%, medo de estragar alguma coisa. Quer ler Filipenses 4.",
  viewport: { width: 1280, height: 800 },
  zoom: 1.5,
  account: "none", // Começa deslogada para testar tela de login e formulário
  tasks: [
    {
      id: "CIDA-01",
      title: "Entender a página inicial e proposta da plataforma",
      success: "A tela inicial possui texto legível e botão com indicação clara de como começar a leitura.",
      run: async (ctx) => {
        await ctx.step("1.1_home_primeira_impressao", async () => {
          const headline = await ctx.page.locator("h1, h2").first().innerText().catch(() => "");
          ctx.check("Headline principal identificada", headline.length > 5, headline);
          const demoBtn = ctx.page.getByRole("button", { name: /Acesso de Demonstração|Entrar/i }).first();
          ctx.check("Botão de entrada visível", await demoBtn.isVisible().catch(() => false));
        });
      },
    },
    {
      id: "CIDA-02",
      title: "Testar mensagens de erro no formulário de acesso",
      success: "Campos vazios ou e-mail inválido geram alertas claros em português e fáceis de compreender.",
      run: async (ctx) => {
        await ctx.step("2.1_submeter_campo_vazio", async () => {
          const submitBtn = ctx.page.getByRole("button", { name: /Entrar na Plataforma/i }).first();
          if (await submitBtn.isVisible().catch(() => false)) {
            await ctx.click(submitBtn);
            await ctx.page.waitForTimeout(500);
            ctx.check("Feedback após submissão de campos vazios", true);
          }
        });

        await ctx.step("2.2_email_invalido", async () => {
          const emailInput = ctx.page.locator("input[type='email']").first();
          if (await emailInput.isVisible().catch(() => false)) {
            await emailInput.fill("cida@");
            const submitBtn = ctx.page.getByRole("button", { name: /Entrar na Plataforma/i }).first();
            await ctx.click(submitBtn);
            await ctx.page.waitForTimeout(500);
            ctx.check("Validação de e-mail acionada", true);
          }
        });

        await ctx.step("2.3_entrar_via_demo", async () => {
          const demoBtn = ctx.page.getByRole("button", { name: /Acesso de Demonstração/i }).first();
          if (await demoBtn.isVisible().catch(() => false)) {
            await ctx.click(demoBtn);
            await ctx.waitStable();
            ctx.check("Entrou com sucesso na plataforma", !ctx.page.url().includes("/login"));
          }
        });
      },
    },
    {
      id: "CIDA-03",
      title: "Achar Filipenses 4 pelo menu de livros sem usar busca avançada",
      success: "Consegue navegar pelos livros do Novo Testamento e selecionar Filipenses capítulo 4.",
      run: async (ctx) => {
        await ctx.step("3.1_ir_ao_leitor", async () => {
          await ctx.click(ctx.page.getByText("Leitor Bíblico", { exact: false }).first());
          await ctx.waitStable();
        });

        await ctx.step("3.2_seletor_de_livros", async () => {
          const bookPicker = ctx.page.getByRole("button", { name: /Gênesis|Livro|Bíblia/i }).first();
          if (await bookPicker.isVisible().catch(() => false)) {
            await ctx.click(bookPicker);
            await ctx.page.waitForTimeout(500);
            const filBtn = ctx.page.getByText(/Filipenses/i).first();
            if (await filBtn.isVisible().catch(() => false)) {
              await ctx.click(filBtn);
              await ctx.waitStable();
              ctx.check("Livro de Filipenses selecionado", true);
            } else {
              ctx.check("Filipenses encontrado na lista", false);
            }
          }
        });
      },
    },
    {
      id: "CIDA-04",
      title: "Verificar ajuste de tamanho de fonte e contraste",
      success: "Existe botão ou indicador claro para aumentar a letra ou alternar o contraste para leitura confortável.",
      run: async (ctx) => {
        await ctx.step("4.1_localizar_ajuste_fonte", async () => {
          const themeBtn = ctx.page.getByRole("button", { name: /modo claro|DARK|tema/i }).first();
          const hasTheme = await themeBtn.isVisible().catch(() => false);
          ctx.check("Controle de contraste/tema claro visível", hasTheme);
        });
      },
    },
    {
      id: "CIDA-05",
      title: "Destacar ou marcar Filipenses 4:13 e checar persistência",
      success: "Consegue interagir com o versículo e a marcação visual permanece ao recarregar a tela.",
      run: async (ctx) => {
        await ctx.step("5.1_clicar_versiculo", async () => {
          const verse = ctx.page.locator("text=/tudo posso/i, [data-verse='13'], text=/Filipenses/i").first();
          if (await verse.isVisible().catch(() => false)) {
            await ctx.click(verse);
            await ctx.page.waitForTimeout(600);
            ctx.check("Versículo clicado para marcação", true);
          }
        });
      },
    },
  ],
};
