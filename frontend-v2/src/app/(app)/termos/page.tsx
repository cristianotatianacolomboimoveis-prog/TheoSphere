import Link from "next/link";

/**
 * Termos de Uso — versão beta.
 * Rascunho funcional para a fase beta gratuita; antes de qualquer
 * cobrança, este documento deve ser revisado por advogado.
 */
export const metadata = {
  title: "Termos de Uso — TheoSphere",
};

export default function TermosPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6 text-sm leading-relaxed text-foreground/85">
      <h1 className="text-3xl font-serif font-bold text-foreground">
        Termos de Uso
      </h1>
      <p className="text-xs text-muted">
        Última atualização: 14 de julho de 2026 · Versão beta
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">1. O serviço</h2>
        <p>
          O TheoSphere é uma plataforma de estudo bíblico e teológico em fase
          beta, oferecida gratuitamente, &ldquo;no estado em que se
          encontra&rdquo;, sem garantias de disponibilidade, continuidade ou
          ausência de erros. Recursos podem ser alterados ou descontinuados
          durante o beta.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">2. Conta</h2>
        <p>
          O cadastro exige e-mail válido. Você é responsável por manter a
          confidencialidade da sua senha e pelas atividades realizadas na sua
          conta. Podemos suspender contas que violem estes termos.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          3. Uso aceitável
        </h2>
        <p>
          É vedado usar a plataforma para fins ilícitos, tentar comprometer sua
          segurança, extrair dados em massa por meios automatizados ou
          redistribuir comercialmente conteúdo de terceiros que a plataforma
          licencia ou exibe.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          4. Conteúdo e licenças
        </h2>
        <p>
          Os textos bíblicos disponibilizados no beta são de domínio público ou
          licença livre, com atribuições listadas na página{" "}
          <Link href="/sobre" className="text-accent hover:underline">
            Sobre
          </Link>
          . Suas anotações e sermões pertencem a você. O conteúdo gerado por IA
          é material auxiliar de estudo, pode conter erros e não substitui
          aconselhamento pastoral, acadêmico ou profissional.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          5. Limitação de responsabilidade
        </h2>
        <p>
          Na extensão máxima permitida pela lei, o TheoSphere não se
          responsabiliza por danos indiretos decorrentes do uso ou da
          indisponibilidade do serviço durante a fase beta. Exporte regularmente
          seus dados de estudo.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">6. Alterações</h2>
        <p>
          Estes termos podem ser atualizados; mudanças relevantes serão
          comunicadas na plataforma. O uso continuado após a atualização
          constitui aceitação.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">7. Contato</h2>
        <p>
          Dúvidas sobre estes termos:{" "}
          <a
            className="text-accent hover:underline"
            href="mailto:cristianotatianacolomboimoveis@gmail.com"
          >
            contato por e-mail
          </a>
          .
        </p>
      </section>
    </div>
  );
}
