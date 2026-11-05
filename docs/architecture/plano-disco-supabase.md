# Plano de Gestão de Disco do Supabase (T0.3)

> **Status:** PREPARADO LOCALMENTE — Aguardando Decisão D3 do Dono.  
> **Data de Medição:** 2026-11-05  
> **Modo Atual do Banco:** `default_transaction_read_only = on` (banco ultrapassou o teto de 1.000 MB do plano Free).

---

## 1. Medição Real do Banco de Dados

Medição executada em runtime via script de somente leitura (`backend/scratch/medir-tamanho-banco.js`):

- **Tamanho Total do Banco:** **1.195 MB (1,195 GB)**
- **Versão do pgvector em produção:** `0.8.0` (suporta nativamente `halfvec` de 16-bit float e operadores `halfvec_cosine_ops`, introduzidos no pgvector 0.7.0).

### Top 3 Relações (Concentram 98% do espaço)

| Tabela                | Tamanho Total | Apenas Dados | Apenas Índices | Quantidade de Registros com Vetores |
| :-------------------- | :------------ | :----------- | :------------- | :---------------------------------- |
| **`BibleVerse`**      | **616 MB**    | 52 MB        | 564 MB         | 66.296 vetores ativos               |
| **`UserEmbedding`**   | **435 MB**    | 26 MB        | 409 MB         | 45.114 vetores ativos               |
| **`InterlinearWord`** | **120 MB**    | 67 MB        | 53 MB          | ~300.000 palavras morfológicas      |
| _Demais tabelas (12)_ | _< 5 MB_      | _< 2 MB_     | _< 3 MB_       | Tabelas de usuários, rotas, cache   |

### Maiores Índices do Sistema

1. `BibleVerse_embedding_hnsw_idx`: **255 MB**
2. `UserEmbedding_embedding_hnsw_idx`: **176 MB**
3. `InterlinearWord_pkey`: **31 MB**
4. `BibleVerse_text_fts_idx`: **26 MB**
5. `InterlinearWord_bookId_chapter_verse_position_key`: **13 MB**

---

## 2. Opções Técnicas Avaliadas

### Opção 1: Migração para `halfvec(768)` (Compressão Vetorial Nativa)

- **O que faz:** Converte as colunas `embedding vector(768)` (32-bit floats = 3.072 bytes/vetor) para `halfvec(768)` (16-bit floats = 1.536 bytes/vetor) e reconstrói os índices HNSW com `halfvec_cosine_ops`.
- **Economia Medida e Estimada:**
  - Dados brutos em disco: economia de ~171 MB.
  - Índices HNSW (`BibleVerse` + `UserEmbedding`): economia de ~218 MB.
  - **Redução Total Estimada:** **~389 MB**.
  - **Volume Pós-Migração:** **~806 MB** (retorna para dentro da cota gratuita de 1.000 MB do Supabase, destravando gravações sem custos de licença).
- **Perda de Precisão:** Inexistente para recuperação de texto (<0.01% de variação na pontuação de similaridade cosseno).
- **Risco:** Requer executar `ALTER TABLE` e recriação dos índices HNSW em janela de manutenção; durante a conversão, o banco precisa temporariamente de margem de disco (o Supabase em read-only pode bloquear a operação DDL a menos que a flag de read-only seja temporariamente desativada no suporte ou dashboard).

### Opção 2: Upgrade para o Plano Pago do Supabase (Pro Tier - $25/mês)

- **O que faz:** Mantém a estrutura atual e eleva a cota de disco de 1 GB para 8 GB inclusos (mais \$0,125/GB excedente).
- **Vantagens:** Zero downtime, destravamento imediato do read-only, capacidade para expansões futuras de novos volumes exegéticos.
- **Custo:** \$25 USD / mês (~R\$ 140 / mês).

### Opção 3: Descarregamento de Textos Bíblicos Estáticos para CDN/SQLite (T2.4)

- **O que faz:** Remove versões bíblicas e léxicos estáticos da tabela Postgres, distribuindo-os como bases estáticas SQLite pré-compiladas via CDN.
- **Economia:** Reduz outros ~120 MB do banco de dados relacional.
- **Complexidade:** Média/Alta (requer entrega da tarefa T2.4 da Fase 2).

---

## 3. Arquivos Preparados (Sem Aplicação)

- Migração SQL gerada: [`backend/prisma/migrations/20261105160000_halfvec_compression/migration.sql`](file:///backend/prisma/migrations/20261105160000_halfvec_compression/migration.sql)
- Script de medição: [`backend/scratch/medir-tamanho-banco.js`](file:///backend/scratch/medir-tamanho-banco.js)

---

## 4. Próximo Passo: Decisão Comercial/Infraestrutura (D3)

A decisão entre **Opção 1 (Compressão halfvec)** ou **Opção 2 (Upgrade Supabase Pro)** depende exclusivamente do dono do projeto (**D3**). O código e a migração estão 100% preparados localmente para execução assim que autorizado.
