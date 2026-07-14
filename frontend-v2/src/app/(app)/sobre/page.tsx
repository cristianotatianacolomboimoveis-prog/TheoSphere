import Link from "next/link";

/**
 * Página Sobre / Beta — avisos da fase beta e atribuições de licença
 * (a atribuição é obrigatória para BLIVRE (CC BY 3.0 BR) e NVA (CC BY-SA 4.0)).
 */
export const metadata = {
  title: "Sobre o TheoSphere",
};

export default function SobrePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-foreground/85">
      <header>
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Sobre o TheoSphere
        </h1>
        <p className="mt-2 text-sm text-muted">
          Plataforma de pesquisa bíblica e teológica — versão{" "}
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase">
            Beta
          </span>
        </p>
      </header>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-foreground">Fase Beta</h2>
        <p>
          O TheoSphere está em fase beta gratuita. Isso significa que recursos
          podem mudar, dados de estudo pessoais devem ser exportados com
          regularidade e instabilidades podem ocorrer. Seu feedback é o
          principal instrumento para amadurecermos a plataforma.
        </p>
        <p>
          O conteúdo gerado pelo assistente de IA é auxílio de estudo, não
          autoridade teológica: confira sempre as fontes e o texto bíblico.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-foreground">
          Textos bíblicos e licenças
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Bíblia Livre (BLIVRE)</strong> — tradução baseada na
            Almeida, edição Textus Receptus. Licença{" "}
            <a
              className="text-accent hover:underline"
              href="https://creativecommons.org/licenses/by/3.0/br/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Creative Commons Atribuição 3.0 Brasil
            </a>
            . Projeto:{" "}
            <a
              className="text-accent hover:underline"
              href="https://sites.google.com/site/biblialivre/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bíblia Livre
            </a>
            .
          </li>
          <li>
            <strong>Nova Versão de Acesso Livre (NVA)</strong> — licença{" "}
            <a
              className="text-accent hover:underline"
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY-SA 4.0
            </a>
            .
          </li>
          <li>
            <strong>King James Version (KJV)</strong>,{" "}
            <strong>Textus Receptus (TR)</strong> e{" "}
            <strong>Westminster Leningrad Codex (WLC)</strong> — domínio público
            / licença livre.
          </li>
          <li>
            Dados de referências cruzadas baseados no{" "}
            <em>Treasury of Scripture Knowledge</em> (domínio público).
          </li>
          <li>
            O acervo arqueológico reúne informações factuais de fontes
            acadêmicas abertas, com descrições originais do TheoSphere e
            classificação de autenticidade (confirmada, debatida ou disputada).
          </li>
        </ul>
      </section>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-foreground">Documentos</h2>
        <p>
          <Link href="/termos" className="text-accent hover:underline">
            Termos de Uso
          </Link>{" "}
          ·{" "}
          <Link href="/privacidade" className="text-accent hover:underline">
            Política de Privacidade
          </Link>
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold text-foreground">Contato</h2>
        <p>
          Dúvidas, erros encontrados ou sugestões:{" "}
          <a
            className="text-accent hover:underline"
            href="mailto:cristianotatianacolomboimoveis@gmail.com"
          >
            fale conosco
          </a>
          .
        </p>
      </section>
    </div>
  );
}
