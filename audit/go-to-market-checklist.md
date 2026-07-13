# TheoSphere — Checklist Go-to-Market

> Gerado pela Nexus Dev Team em 2026-07-13. Ordem recomendada: Fase 0 → 4.
> Nota: itens jurídicos (licenças, LGPD) exigem validação com advogado — isto não é aconselhamento jurídico.

---

## Auditoria de Licenciamento (feita em 2026-07-13)

Traduções ativas no produto (`bible.controller.ts` / `bible-ingestion.service.ts`):

| Código | Tradução                               | Status legal                          | Pode vender?     |
| ------ | -------------------------------------- | ------------------------------------- | ---------------- |
| ARA    | Almeida Revista e Atualizada           | © Sociedade Bíblica do Brasil (SBB)   | ❌ Exige licença |
| NVIPT  | Nova Versão Internacional (PT)         | © Biblica                             | ❌ Exige licença |
| KJV    | King James Version                     | Domínio público (fora do Reino Unido) | ✅               |
| TR     | Textus Receptus (grego)                | Domínio público                       | ✅               |
| WLC    | Westminster Leningrad Codex (hebraico) | Licença livre                         | ✅               |

**Fonte de ingestão:** `bolls.life` — API gratuita. Verificar termos de uso para redistribuição comercial antes de vender (mesmo para textos em domínio público, a _fonte_ pode ter restrições).

**Alternativas em português SEM custo de licença (para o beta):**

- **Bíblia Livre (BLIVRE)** — CC BY 3.0 BR, permite uso comercial com atribuição ✅ **IMPLEMENTADA (2026-07-13)**
- **Nova Versão de Acesso Livre (NVA)** — CC BY-SA 4.0 ✅ **IMPLEMENTADA (2026-07-13)**
- ~~Tradução Brasileira (1917)~~ — descartada: a única fonte de API disponível (bolls.life `TB10`) é a edição 2010 da SBB, cuja revisão pode ter copyright próprio. A edição 1917 original só existe em fontes não estruturadas.

**Implementação (2026-07-13):**

- Dados: `backend/prisma/data/BLIVRE.json` e `NVA.json` (31k versículos cada, fonte: scrollmapper/bible_databases ← eBible.org)
- Seed: `npm run db:seed:free-bibles` (idempotente, roda no terminal local — o sandbox não alcança o Supabase)
- Backend: `GET /bible/versions` agora retorna `meta` com licença por versão (`free`/`restricted`)
- Frontend: BLIVRE é a tradução padrão do leitor; NVA disponível no seletor

---

## Fase 0 — Beta Gratuito (pode fazer AGORA) — custo: R$ 0

- [ ] Substituir/complementar ARA e NVIPT por Bíblia Livre + Tradução Brasileira no seletor padrão
  - Alternativa conservadora: manter ARA/NVIPT visíveis apenas em ambiente de teste pessoal, nunca no beta público
- [ ] Adicionar página "Sobre / Beta" com aviso de que é versão de testes
- [ ] Adicionar Termos de Uso e Política de Privacidade básicos (há cadastro de usuários → LGPD se aplica mesmo grátis)
- [ ] Confirmar produção funcionando: `https://theosphere.onrender.com/api/v1/health` + frontend Vercel
- [ ] Atenção Vercel: o plano **Hobby proíbe uso comercial**. Para beta gratuito ok; ao vender, migrar para Pro
- [ ] Configurar monitoramento gratuito (UptimeRobot ping a cada 5min — bônus: reduz o auto-sleep do Render)
- [ ] Divulgar para grupo pequeno (igrejas, seminários, amigos teólogos) e coletar feedback

## Fase 1 — Licenciamento de Textos — custo: variável (negociação)

- [ ] Contatar SBB (ARA, NAA, ARC): licenciamento digital — royalties tipicamente por assinante ou % de receita
- [ ] Contatar Biblica (NVI): programa de licenciamento próprio
- [ ] Verificar termos do bolls.life para uso comercial; se restrito, ingerir de fontes licenciadas diretamente
- [ ] Documentar por escrito toda permissão obtida
- [ ] Consultar advogado de propriedade intelectual antes do lançamento pago

## Fase 2 — Infraestrutura Paga — custo: ~US$ 35–55/mês inicial

- [ ] Render Starter (sem auto-sleep): US$ 7/mês
- [ ] Vercel Pro (uso comercial): US$ 20/mês
- [ ] Supabase: free tier aguenta o beta; Pro US$ 25/mês quando houver tráfego real
- [ ] Domínio próprio (ex: theosphere.com.br): ~R$ 40/ano
- [ ] Sentry (erros) free tier + UptimeRobot: R$ 0
- [ ] Alertas de quota do Gemini API (hoje é o único LLM — definir limite de gasto)

## Fase 3 — Camada Comercial — custo: taxas por transação

- [ ] Stripe ou Mercado Pago (público BR: Pix é essencial — Mercado Pago ou Stripe+Pix)
- [ ] Modelo de planos: Free (textos PD, N consultas IA/mês) / Pro (textos licenciados, IA ilimitada)
- [ ] Rate limiting por plano no backend (guard NestJS + Redis)
- [ ] Testes e2e dos fluxos críticos: auth, busca, RAG, billing (cobertura atual: 31 testes unitários — insuficiente)

## Fase 4 — Conformidade — custo: honorários advocatícios

- [ ] LGPD: base legal, consentimento, exclusão de conta/dados (endpoint de delete)
- [ ] Termos de uso comerciais + política de reembolso (CDC: 7 dias)
- [ ] CNPJ/MEI para faturar

---

## Resumo de custos mensais estimados (fase vendável)

| Item                             | Custo                   |
| -------------------------------- | ----------------------- |
| Render Starter                   | US$ 7                   |
| Vercel Pro                       | US$ 20                  |
| Supabase Pro (quando necessário) | US$ 25                  |
| Gemini API                       | variável (definir teto) |
| Royalties SBB/Biblica            | a negociar              |
| **Total infra base**             | **~US$ 27–52/mês**      |
