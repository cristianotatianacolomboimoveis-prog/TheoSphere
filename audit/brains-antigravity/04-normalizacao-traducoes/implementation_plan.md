# Plano de Implementação — Passo 4: Limpeza e Normalização de Traduções

Execução do **Passo 4** das pendências de engenharia: normalização definitiva da chave de tradução (case-insensitivity `'ara'` vs `'ARA'`, `'blivre'` vs `'BLIVRE'`) no backend e enriquecimento transparente do catálogo de versões na interface do usuário (exibição das 7 versões canônicas completas do acervo local e marcação explícita de amostras parciais).

---

## 🎯 Objetivos

1. **Normalização no Backend (`SearchService`):**
   - Assegurar que qualquer filtro de tradução recebido na busca híbrida e estruturada seja normalizado com `.toUpperCase().trim()`.
   - Evitar que queries com `translation=blivre` falhem silenciosamente ou retornem vazio devido à chave maiúscula `'BLIVRE'` na tabela `BibleVerse`.

2. **Enriquecimento do Catálogo de Versões na UI (`BibleReader.tsx` e `TranslationPicker.tsx`):**
   - Apresentar as 7 versões canônicas completas do banco local:
     - `BLIVRE` — Bíblia Livre (PT • Equivalência Formal • Licença Livre)
     - `NVA` — Nova Versão de Acesso Livre (PT • Equivalência Dinâmica • Licença Livre)
     - `KJV` — King James Version (EN • Equivalência Formal • Domínio Público)
     - `WEB` — World English Bible (EN • Equivalência Formal • Domínio Público)
     - `TR` — Textus Receptus (GRC • Novo Testamento Grego Original)
     - `WLC` — Westminster Leningrad Codex (HEB • Antigo Testamento Hebraico Original)
     - `LXX` — Septuaginta (GRC • Antigo Testamento Grego)
   - Rotular com precisão versões parciais (ex: `ARA`, `NVIPT`) com `isPartial: true` e badge `"Amostra"`.

---

## 🛠️ Mudanças Propostas

### Backend

#### [MODIFY] [`backend/src/search/search.service.ts`](file:///Users/cristianocolombo/Downloads/TheoSphere/backend/src/search/search.service.ts)

- Adicionar normalização `opts.translation?.toUpperCase().trim()` em `hybridSearchVerses`, `advancedSearch`, `vectorSearch` e `keywordSearch`.

### Frontend

#### [MODIFY] [`frontend-v2/src/components/BibleReader.tsx`](file:///Users/cristianocolombo/Downloads/TheoSphere/frontend-v2/src/components/BibleReader.tsx)

- Atualizar a lista exportada `TRANSLATIONS` com as 7 versões canônicas completas do acervo e rótulos claros de idiomas e escopos (NT Grego, AT Hebraico, etc.).

---

## 🧪 Plano de Verificação

- Testar busca híbrida com parâmetro em minúsculo: `GET /search/verses?q=luz&translation=blivre`.
- Testar busca híbrida com parâmetro em maiúsculo: `GET /search/verses?q=light&translation=KJV`.
- Executar `node audit/scripts/static-checks.mjs` para garantir 0 achados de lint/integridade.
- Executar a suíte de QA.
