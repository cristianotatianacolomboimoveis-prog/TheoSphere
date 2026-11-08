# Verificação de Licença — MACULA Greek Treebank / Lowfat Syntax (T1.5)

**Data da verificação:** 2026-11-08  
**Fonte oficial:** [Clear-Bible/macula-greek](https://github.com/Clear-Bible/macula-greek)  
**Commit verificado:** `8423afe47b9e8f24b7772e808af45c7159a6fe7e`  
**Licença:** Creative Commons Attribution 4.0 International (CC BY 4.0)  
**URL da Licença:** https://creativecommons.org/licenses/by/4.0/ e https://raw.githubusercontent.com/Clear-Bible/macula-greek/main/LICENSE.md

## 1. Termos e Permissões

- **Compartilhamento:** Copiar e redistribuir o material em qualquer suporte ou formato.
- **Adaptação:** Remixar, transformar e construir sobre o material para qualquer fim, inclusive comercial.
- **Exigências:** Atribuição adequada, fornecimento de link para a licença e indicação se foram feitas alterações.
- **Sem restrições adicionais:** Não aplicar termos legais ou medidas de caráter tecnológico que restrinjam o uso legal.

## 2. Atribuição e Créditos Canônicos

"MACULA Greek Linguistic Datasets / Lowfat Syntax Treebank por Clear Bible / Biblica, Inc. (Jonathan Robie, Ulrik Sandborg-Petersen, Andi Wu, Randall K. Tan), disponível em https://github.com/Clear-Bible/macula-greek/, baseado no Novo Testamento Grego (SBLGNT / Nestle 1904). Glosas em inglês da Berean Interlinear Bible (Domínio Público) e Cherith Glosses (Andi Wu, CC BY 4.0). Licenciado sob CC BY 4.0."

## 3. Avaliação no Portão de Licença do TheoSphere

- [x] Licença explícita verificada no arquivo `LICENSE.md` do repositório oficial (`commit 8423afe47b9e8f24b7772e808af45c7159a6fe7e`).
- [x] Permite uso comercial (sem cláusula NC).
- [x] Não contém cláusula ShareAlike ou NoDerivatives (sem SA/ND).
- [x] Compatível com os requisitos de atribuição na UI.
- **Status:** **APROVADO E IMPORTADO NO THEOSPHERE**.

## 4. Estado da implementação (2026-11-08)

- **Script de importação:** `backend/scripts/import-macula-lowfat.ts` (sem LLM e sem heurística; lê diretamente a estrutura `<wg>`/`<w>` dos arquivos Lowfat XML de `SBLGNT/lowfat/` e complementa 4 versículos críticos de `Nestle1904/lowfat/`).
- **Dataset versionado:** `backend/prisma/data/macula-syntax-trees.json.gz` (`32,38 MB` JSON → `4,09 MB` `.json.gz`, escolhido para não consumir espaço adicional no disco do Supabase e responder em `< 1 ms` em memória).
- **Cobertura medida:** `7.939` versículos do SBLGNT + `4` versículos do Nestle 1904 (`JHN 5:4`, `ROM 16:25-27`) = `7.943` versículos canônicos únicos (`7.945` chaves com aliases de versificação `ACT.19.41` e `2CO.13.14`), cobrindo `137.741` palavras gregas com IDs MACULA (`nBBCCCVVVPPP`), papéis funcionais (`S`, `P`, `O`, `IO`, `O2`, `ADV`, `V`, `VC`, `AUX`, `CONJ`), lema, morfologia e Strong.
- **Morfologia do SBLGNT (T1.1):** sincronizada na tabela `InterlinearWord` a partir do mesmo dataset MACULA SBLGNT (sem uso do MorphGNT CC BY-SA).
