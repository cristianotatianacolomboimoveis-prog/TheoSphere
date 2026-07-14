/**
 * Política de Privacidade — LGPD (Lei 13.709/2018).
 * Rascunho funcional para a fase beta; revisar com advogado antes da
 * fase comercial.
 */
export const metadata = {
  title: "Política de Privacidade — TheoSphere",
};

export default function PrivacidadePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6 text-sm leading-relaxed text-foreground/85">
      <h1 className="text-3xl font-serif font-bold text-foreground">
        Política de Privacidade
      </h1>
      <p className="text-xs text-muted">
        Última atualização: 14 de julho de 2026 · Conforme a LGPD (Lei
        13.709/2018)
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          1. Dados que coletamos
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Cadastro:</strong> e-mail e senha (armazenada apenas como
            hash criptográfico).
          </li>
          <li>
            <strong>Uso do estudo:</strong> anotações, sermões, histórico de
            conversas com o assistente de IA e progresso de leitura.
          </li>
          <li>
            <strong>Técnicos:</strong> registros de acesso (data, hora e IP)
            exigidos pelo Marco Civil da Internet.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          2. Para que usamos
        </h2>
        <p>
          Autenticar sua conta, guardar seu material de estudo, operar o
          assistente de IA e melhorar a plataforma. Base legal: execução de
          contrato (art. 7º, V) e legítimo interesse (art. 7º, IX). Não vendemos
          seus dados nem exibimos publicidade.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          3. Com quem compartilhamos
        </h2>
        <p>
          Operadores de infraestrutura estritamente necessários: hospedagem do
          banco de dados (Supabase), do backend (Render) e do site (Vercel), e o
          provedor do modelo de IA (Google Gemini) — que recebe apenas o
          conteúdo das perguntas enviadas ao assistente. Alguns desses
          servidores ficam fora do Brasil, o que configura transferência
          internacional nos termos da LGPD.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          4. Seus direitos (art. 18)
        </h2>
        <p>
          Você pode solicitar acesso, correção, portabilidade e exclusão dos
          seus dados, além de informação sobre compartilhamentos. Para
          exercê-los, escreva para{" "}
          <a
            className="text-accent hover:underline"
            href="mailto:cristianotatianacolomboimoveis@gmail.com"
          >
            nosso e-mail de contato
          </a>
          . A exclusão da conta remove seus dados pessoais em até 30 dias,
          ressalvados registros de guarda obrigatória.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          5. Cookies e armazenamento local
        </h2>
        <p>
          Usamos apenas armazenamento local essencial (sessão de login,
          preferências de leitura e cache de capítulos para uso offline). Não
          usamos cookies de rastreamento de terceiros.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">6. Segurança</h2>
        <p>
          Senhas com hash, tráfego criptografado (HTTPS), tokens de sessão de
          curta duração e princípio do menor privilégio no acesso à
          infraestrutura. Nenhum sistema é infalível; incidentes relevantes
          serão comunicados conforme a LGPD.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          7. Controlador
        </h2>
        <p>
          TheoSphere (fase beta) — contato:{" "}
          <a
            className="text-accent hover:underline"
            href="mailto:cristianotatianacolomboimoveis@gmail.com"
          >
            cristianotatianacolomboimoveis@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
