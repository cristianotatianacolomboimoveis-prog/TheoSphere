# Verificação de Licença — MACULA Greek Treebank / Lowfat Syntax (T1.5)

**Data da verificação:** 2026-11-05  
**Fonte oficial:** [Clear-Bible/macula-greek](https://github.com/Clear-Bible/macula-greek) e [Clear-Bible/gnt-syntax (Lowfat Treebank)](https://github.com/Clear-Bible)  
**Licença:** Creative Commons Attribution 4.0 International (CC BY 4.0)  
**URL da Licença:** https://creativecommons.org/licenses/by/4.0/ e https://raw.githubusercontent.com/Clear-Bible/macula-greek/main/LICENSE

## 1. Termos e Permissões

- **Compartilhamento:** Copiar e redistribuir o material em qualquer suporte ou formato.
- **Adaptação:** Remixar, transformar e construir sobre o material para qualquer fim, inclusive comercial.
- **Exigências:** Atribuição adequada, fornecimento de link para a licença e indicação se foram feitas alterações.
- **Sem restrições adicionais:** Não aplicar termos legais ou medidas de caráter tecnológico que restrinjam o uso legal.

## 2. Atribuição e Créditos Canônicos

"MACULA Greek Linguistic Datasets / Lowfat Syntax Treebank por Clear Bible (Jonathan Robie, Ulrik Sandborg-Petersen, Andi Wu, Randall K. Tan), baseado no texto crítico do Novo Testamento Grego (SBLGNT / Nestle 1904). Licenciado sob CC BY 4.0."

## 3. Avaliação no Portão de Licença do TheoSphere

- [x] Licença explícita verificada em repositório oficial.
- [x] Permite uso comercial (sem cláusula NC).
- [x] Não contém cláusula de proibição de obras derivadas (sem cláusula ND).
- [x] Compatível com os requisitos de atribuição na UI.
- **Status:** **APROVADO PARA INGESTÃO E USO NO THEOSPHERE**.

## 4. Estado da implementação (revisão de 2026-11-05)

A **licença** do MACULA Greek foi conferida na fonte (`LICENSE.md` do
repositório Clear-Bible/macula-greek: CC BY 4.0) e está aprovada.

A **ingestão, porém, não foi feita.** Os 7 versículos servidos hoje
(`backend/src/linguistics/treebanks/curated-syntax.data.ts`) foram escritos à mão,
sem importar o XML do MACULA e sem os IDs de palavra. Por isso são servidos com
`method: 'curated-manual'` e `isAnnotatedTree: false`. Nenhum diagrama do
TheoSphere deve exibir "Árvore Anotada (Treebank)" até existir um script de
importação do Lowfat XML que preserve os IDs de palavra do MACULA.
