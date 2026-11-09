# Relatório de Operação: Plano Nano — Etapa 2 (Medição da Quantização Binária)

Data: 2026-11-08  
Horário: 21:38 BRT  
Branch: `etapa-2/medicao-quantizacao-binaria` (baseada na `main` em `c4ddf47`)

---

## 1. Verificação de Horário e Janela Noturna (Seção 3.1)

- **Horário Atual Verificado:**
  ```bash
  date
  # Sun Nov  8 21:35:02 -03 2026 (21:35 BRT)
  ```
- **Conformidade com a Janela Noturna (00:00 às 06:00 BRT):**
  - Conforme instrução estrita da Seção 3.1 do `AGENTS.md` e determinação do usuário/Claude Code, **nenhuma exportação contra o banco de dados Supabase Nano será iniciada antes das 00:00 BRT**.
  - O script `backend/scripts/medir-quantizacao-binaria.ts` foi implementado com bloqueio automático ativo:
    ```text
    =======================================================
    Plano Nano - Etapa 2: Medição de Quantização Binária
    Horário verificado: 21:37 BRT
    =======================================================
    [ERRO DE JANELA NOTURNA]: Arquivos de exportação não encontrados e o horário atual (21:37 BRT) está fora da janela de 00:00 às 06:00 BRT.
    A exportação de banco de dados só pode ser realizada após as 00:00 BRT.
    ```
    Código de saída retornado: `1` (bloqueio ativado com sucesso).

---

## 2. Preparação dos Algoritmos e Validação Matemática

### 2.1 Script de Exportação e Benchmark (`medir-quantizacao-binaria.ts`)

- **Estratégia de Extração no Nano:**
  - Exportação paginada por cursor (`ORDER BY "bookId", chapter, verse`) em lotes de 2.000 versículos com `2.000 ms` de pausa entre requisições para evitar esgotamento de I/O de disco.
  - Gravação dos vetores em `backend/scratch/vectors_BLIVRE.jsonl` e `backend/scratch/vectors_WEB.jsonl`.
- **Estatísticas de Centralização dos Vetores (Exigência Nova):**
  - O script calcula a média global dos floats e a distribuição/fração de valores estritamente maiores que 0 (`val > 0`) em cada uma das 768 dimensões.
  - Vetores de embedding não centrados em zero têm maior propensão a viés na quantização por sinal; esses números explicarão o nível de recall obtido.
- **Medição Determinística de Recall:**
  - PRNG Mulberry32 com semente fixa `seed = 20261109`.
  - 300 versículos sorteados como consultas em cada tradução, excluindo o próprio versículo do ranking.
  - Referência: Top-10 por similaridade de cosseno exata (Float32Array).
  - Candidatos: Top-P por menor distância de Hamming entre representações `Uint32Array(24)` (768 bits) com popcount rápido de 32 bits, seguido de rerank por cosseno exato.
  - Avaliação de `recall@10` para `P = 40`, `P = 100` e `P = 200`.

### 2.2 Testes Unitários dos Algoritmos Binários

- Criado arquivo de especificação [`backend/src/rag/quantizacao-binaria.spec.ts`](file:///Users/cristianocolombo/Desktop/Theosphere%202026/backend/src/rag/quantizacao-binaria.spec.ts).
- 3 testes Jest cobrindo:
  - `popcount32`: contagem de bits 1;
  - `quantizeBinary`: binarização baseada em `v[i] > 0`;
  - `hammingDistance768`: distância em 768 bits através de 24 inteiros de 32 bits.
- Status: 3/3 testes passando.

---

## 3. O que NÃO foi Verificado

1. **Amostras com Perguntas Reais de Usuários:**
   - A medição de recall utiliza versículos bíblicos como consulta contra a própria tradução (amostragem homogênea). Isso é uma aproximação controlada, mas não reproduz integralmente a dispersão semântica e a extensão de perguntas formuladas em linguagem natural por usuários reais no aplicativo.
2. **Exportação dos Vetores do Banco:**
   - Aguardando o início da janela noturna autorizada (a partir de 00:00 BRT).

---

## 4. Próximos Passos (Janela Noturna 00:00 - 06:00 BRT)

1. A partir das 00:00 BRT, executar:
   ```bash
   cd backend && npx tsx scripts/medir-quantizacao-binaria.ts
   ```
2. Registrar a saída com os horários de início e fim, as estatísticas de média e fração de dimensões positivas, a tabela de `recall@10` para BLIVRE e WEB, e o status de aprovação do portão (`recall@10 ≥ 0,95` com `P ≤ 100`).
