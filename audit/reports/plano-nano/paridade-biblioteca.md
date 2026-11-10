# Relatório de Paridade Integral da Biblioteca (Etapa 3a / Pré-requisito da Etapa 5)

**Data:** 2026-11-10  
**Ambiente:** Supabase sa-east-1 (Compute Nano: 512 MB RAM, 224 MB shared_buffers)  
**Autorização:** Exceção diurna autorizada pelo dono (2026-11-10) — sem concorrência de usuários.

---

## 1. Objetivo

Verificar a integridade e paridade absoluta (1:1 via chave canônica e hash MD5 de conteúdo) entre todos os trechos de livros (`type = 'book_chunk'`) armazenados em `UserEmbedding` e os trechos estruturados em `ResourceChunk` vinculados a `Resource`, antes da remoção das duplicatas prevista na Etapa 5 do Plano Nano.

Critério estrito de aprovação:

- **0 divergências** de conteúdo (MD5 idêntico).
- **0 trechos faltando** no `ResourceChunk`.
- **0 trechos faltando** no `UserEmbedding`.

---

## 2. Pré-checagens e Parâmetros de Execução

Antes de executar a consulta analítica no banco de dados, todas as salvaguardas da Seção 3.1 do `AGENTS.md` foram inspecionadas:

| Checagem                  | Requisito                  | Valor Medido                                                | Status      |
| :------------------------ | :------------------------- | :---------------------------------------------------------- | :---------- |
| `pg_stat_progress_vacuum` | 0 linhas                   | **0 linhas**                                                | ✅ Conforme |
| `Disk IO Balance`         | $\ge 50\%$                 | **99%** (confirmado pelo dono via painel Supabase)          | ✅ Conforme |
| Conexão                   | Conexão direta única       | 1 conexão via `DIRECT_DB_URL` (`statement_timeout = 15min`) | ✅ Conforme |
| Flag diurna               | `PARIDADE_PERMITIR_DIURNO` | `'autorizado-pelo-dono'`                                    | ✅ Conforme |

---

## 3. Implementação da Liberação e Testes com Mutação

### 3.1. Código Adicionado ao Script

Em `backend/scripts/verificar-paridade-biblioteca.ts`, foi introduzida a função `checarJanelaHorarioParidade`:

- Horário noturno (00:00 às 05:59 BRT): liberado por padrão.
- Horário diurno: liberado **apenas** quando `PARIDADE_PERMITIR_DIURNO === 'autorizado-pelo-dono'`, imprimindo aviso explícito no console. Qualquer outro valor ou ausência resulta em bloqueio imediato com exit code 1.

### 3.2. Testes Unitários

Arquivo criado: [`backend/src/rag/verificar-paridade-biblioteca.spec.ts`](file:///Users/cristianocolombo/Desktop/Theosphere%202026/backend/src/rag/verificar-paridade-biblioteca.spec.ts)

- **21 testes unitários** criados:
  1. Liberação noturna padrão (0h, 1h, 3h, 5h BRT).
  2. Bloqueio diurno com variável ausente (6h, 12h, 14h, 18h, 23h BRT).
  3. Bloqueio diurno com valores inválidos (`""`, `"true"`, `"1"`, `"yes"`, `"autorizado"`, `"autorizado-pelo-dono-extra"`, `"AUTORIZADO-PELO-DONO"`).
  4. Liberação diurna estrita com o valor exato `"autorizado-pelo-dono"` com aviso.

### 3.3. Teste de Mutação

- **Mutação aplicada:** substituição de `permitirDiurno === 'autorizado-pelo-dono'` por `Boolean(permitirDiurno)` ("qualquer valor libera").
- **Resultado:** 6 testes falharam imediatamente (`Expected: false, Received: true`), comprovando que valores como `"true"`, `"1"`, etc. não passam despercebidos.
- **Restauração:** mutação revertida e suíte 100% verde (21/21 passando).

### 3.4. Checagens do Monorepo

- `cd backend && npm run typecheck`: 0 erros.
- `cd backend && npm run verificar`: 61 suítes Jest (595 testes passando), lint 0 erros.
- `node audit/scripts/static-checks.mjs`: 0 achados.
- Commit de liberação: `1c24d6b` na `main` e `origin/main`.

---

## 4. Execução da Paridade e Saída Completa

Comando executado:

```bash
PARIDADE_PERMITIR_DIURNO=autorizado-pelo-dono npx tsx scripts/verificar-paridade-biblioteca.ts
```

### Saída Registrada do Terminal

```text
[AVISO] Execução diurna liberada excepcionalmente via PARIDADE_PERMITIR_DIURNO=autorizado-pelo-dono (Horário atual: 17h BRT).
[Paridade Biblioteca] Conectando ao banco... Horário BRT: 17h. statement_timeout: 15min

=== 1. Contagem Exata por Tipo em UserEmbedding ===
┌─────────┬──────────────┬─────────┐
│ (index) │ type         │ total   │
├─────────┼──────────────┼─────────┤
│ 0       │ 'book_chunk' │ '45092' │
│ 1       │ 'highlight'  │ '15'    │
│ 2       │ 'note'       │ '15'    │
└─────────┴──────────────┴─────────┘

=== 2. Exportando Chaves e Hashes de UserEmbedding ===
UserEmbedding lido em 22383ms (45092 trechos)

=== 3. Exportando Chaves e Hashes de ResourceChunk + Resource ===
ResourceChunk lido em 7096ms (45092 trechos)

=== 4. Comparando Todos os Trechos em Memória ===

=== 5. Resultado da Paridade ===
Total UserEmbedding (book_chunk): 45092
Total ResourceChunk:              45092
Coincidentes (mesmo MD5):         45092
Divergentes (MD5 diferente):      0
Faltando no ResourceChunk:        0
Faltando no UserEmbedding:        0

STATUS: APROVADO: 45092/45092 trechos idênticos (0 divergências, 0 faltando).
```

---

## 5. Conclusão Técnica e Liberação para Etapa 5

A auditoria comprova matematicamente que:

1. Todos os **45.092 trechos** de livros presentes em `UserEmbedding` estão perfeitamente replicados e idênticos em `ResourceChunk` (MD5 100% coincidente).
2. Não há trechos órfãos ou faltantes em nenhum dos dois lados.
3. Os únicos registros em `UserEmbedding` que não são livros são as anotações e destaques do usuário (**15 `highlight`** e **15 `note`**), que serão integralmente preservados.
4. **Etapa 5 liberada:** A tabela `ResourceChunk` está pronta para assumir 100% da biblioteca vetorial, autorizando a remoção dos 45.092 `book_chunk` de `UserEmbedding` no momento oportuno.
