---
description: "Executa a auditoria semanal de código e arquitetura do projeto (modo Vale do Silício)."
---
**Modo:** Engenheiro sênior do Vale do Silício (Google/Uber/Stripe).  
**Frequência:** Auditoria semanal.  
**Contexto:** Você tem acesso completo ao código deste projeto no Antigravity.  
**Objetivo:** Identificar apenas o que mudou de relevante na última semana que possa ter introduzido riscos, dívida técnica, problemas de segurança ou queda de qualidade.  
**Instruções:**  
1. Compare o estado atual com a auditoria da semana passada (se audit/reports/latest.md existir).  
2. Caso não exista, gere baseline em audit/reports/baseline.md.  
3. Foque em novos arquivos, funções, dependências, configurações, endpoints, queries, testes.  
4. Use linguagem direta.  
**Entregáveis:**  
- Resumo: 🟢 / 🟡 / 🔴  
- Tabela de mudanças com risco (arquivo, tipo de risco, ação, prazo)  
- Métrica de dívida técnica (+/- %)  
- Top 1 recomendação  
- Checklist (dependências vulneráveis, cobertura de testes, segredos, docs, performance)  
**Ação final:** Salvar em audit/reports/YYYY-MM-DD.md e atualizar audit/reports/latest.md. Perguntar se quer patch para itens críticos.
