# Acervo em Domínio Público para o TheoSphere

Levantamento das principais obras teológicas e bíblicas em **domínio público**
disponíveis no mundo, para popular a biblioteca RAG sem risco autoral.

> **Aviso.** Não sou advogado; isto é informação para você decidir e levar a um
> advogado de propriedade intelectual, não um parecer. Ponto crítico de método:
> "domínio público" depende de **obra + tradução + país**. Um texto antigo (ex.:
> Calvino, séc. XVI) pode ser livre no original, mas uma **tradução moderna** dele
> é obra nova e protegida. No Brasil o prazo é, em regra, \*\*vida do autor/tradutor
>
> - 70 anos\*\*. Nos EUA, obras publicadas antes de 1929 já são domínio público.
>   Confirme caso a caso antes do uso comercial.

---

## 1. Resumo executivo — leia isto primeiro

- **Existe um oceano de material livre — quase todo em inglês/latim.** Os grandes
  clássicos protestantes, patrísticos e de referência têm texto limpo, digitado e
  livre, principalmente via **CCEL** e **StudyLight**.
- **Em português, o domínio público é raso.** As traduções que você tem hoje
  (Institutas por Cultura Cristã/Fiel, Hoekema) são **modernas e protegidas** — vão
  ter que sair do acervo. O que é livre em português: a **Bíblia Almeida antiga
  (1819/1681/1860)**, que você já usa como base do BLIVRE, e poucas traduções
  antigas de patrística.
- **Três caminhos para ter os clássicos em português, todos legais:** (a) servir o
  **texto em inglês** de domínio público; (b) **traduzir você mesmo** o original
  livre (a sua tradução vira obra sua); (c) **tradução por IA** do original livre —
  a plataforma já tem IA, e o resultado é um derivado que você controla (qualidade
  varia, exige revisão). Detalhe na seção 8.

---

## 2. As grandes fontes (onde pegar texto limpo)

| Fonte                              | O que tem                                                                  | Volume                                                                          | Observação                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **CCEL** — ccel.org                | Clássicos cristãos: comentários, teologia, sermões, patrística, referência | Milhares de volumes (Comentários 231, Teologia 110, Sermões 130, Referência 75) | A joia. Domínio público nos EUA. Texto estruturado (ThML), fácil de extrair |
| **StudyLight.org**                 | 143+ comentários clássicos, léxicos, dicionários                           | 143+ comentários                                                                | Verso a verso, todos livres                                                 |
| **Project Gutenberg**              | Livros em domínio público em geral, inclui teologia                        | 70k+                                                                            | Texto limpo, vários idiomas                                                 |
| **Internet Archive** (archive.org) | Digitalizações, muita coisa pré-1929                                       | Enorme                                                                          | Alguns são scans (exigem OCR)                                               |
| **Wikisource** (pt e en)           | Textos livres transcritos, inclui ANF/NPNF e Almeida 1819                  | Grande                                                                          | Boa fonte em PT quando existe                                               |
| **BibleHub / BibleStudyTools**     | Dicionários e léxicos de referência livres                                 | —                                                                               | Bom para conferência                                                        |

---

## 3. Comentários bíblicos (domínio público, inglês)

| Obra                                | Autor                         | Época                         | Perfil                                     |
| ----------------------------------- | ----------------------------- | ----------------------------- | ------------------------------------------ |
| Commentary on the Whole Bible       | **Matthew Henry**             | ~1710                         | O mais amado da exposição protestante      |
| Exposition of the Entire Bible      | **John Gill**                 | séc. XVIII                    | Fortemente calvinista, ótimo para teologia |
| Notes on the Bible                  | **Albert Barnes**             | séc. XIX                      | Notas de NT e AT, muito usado              |
| Commentary Critical and Explanatory | **Jamieson, Fausset & Brown** | 1871                          | Comentário de toda a Bíblia, conciso       |
| Bible Commentaries                  | **John Calvin**               | séc. XVI (trad. antiga livre) | Exegese reformada de referência            |
| Commentary on the Bible             | **Adam Clarke**               | séc. XIX                      | Metodista, detalhista                      |
| Explanatory Notes                   | **John Wesley**               | séc. XVIII                    | Conciso, wesleyano                         |
| **Pulpit Commentary**               | vários                        | séc. XIX                      | 23 volumes, homilético                     |

Fonte prática de todos: **CCEL** e **StudyLight**.

---

## 4. Dicionários, léxicos e enciclopédias (domínio público)

| Obra                                                 | Tipo                                 | Época          |
| ---------------------------------------------------- | ------------------------------------ | -------------- |
| **Easton's Bible Dictionary**                        | Dicionário bíblico (~4.000 verbetes) | 1897           |
| **Smith's Bible Dictionary**                         | Dicionário bíblico                   | 1860s          |
| **ISBE** (International Standard Bible Encyclopedia) | Enciclopédia bíblica                 | 1915           |
| **Hastings' Dictionary of the Bible**                | Dicionário                           | início séc. XX |
| **Thayer's Greek Lexicon**                           | Léxico grego do NT                   | 1889           |
| **Strong's Concordance / Dictionary**                | Concordância + dicionário Strong     | 1890           |
| **Brown-Driver-Briggs (BDB) / Gesenius**             | Léxico hebraico do AT                | 1906           |

> Você já implementou `strong:` e `morph:` no TheoSphere — esses léxicos livres
> reforçam exatamente essa camada.

---

## 5. Pais da Igreja / Patrística (domínio público mundial)

O maior ganho isolado. Coleções do séc. XIX, livres no mundo todo, no CCEL:

- **Ante-Nicene Fathers (ANF)** — 10 volumes (ed. 1885): Justino, Irineu,
  Tertuliano, Orígenes, Clemente, Cipriano, etc.
- **Nicene and Post-Nicene Fathers (NPNF)** — 2 séries × 14 volumes (1886–1900):
  **Agostinho** (Confissões, Cidade de Deus, De Doctrina Christiana), **João
  Crisóstomo**, **Atanásio**, **Jerônimo**, **Ambrósio**, os Concílios Ecumênicos.

Editores: Roberts & Donaldson e **Philip Schaff**. Texto em CCEL e Wikisource.

---

## 6. Clássicos e teologia (domínio público)

| Obra                                      | Autor                             | Observação                                                |
| ----------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Institutes of the Christian Religion      | **João Calvino**                  | Traduções antigas (ex.: Beveridge) livres — em **inglês** |
| Summa Theologica                          | **Tomás de Aquino**               | Tradução dominicana inglesa, livre                        |
| Confissões / Cidade de Deus               | **Agostinho**                     | Via NPNF                                                  |
| Works / sermões                           | **Jonathan Edwards**              | Livre                                                     |
| Sermões                                   | **C. H. Spurgeon**                | Milhares de sermões, domínio público                      |
| O Peregrino (Pilgrim's Progress)          | **John Bunyan**                   | 1678, livre                                               |
| Livro dos Mártires                        | **John Foxe**                     | Livre                                                     |
| Antiguidades / Guerras dos Judeus         | **Flávio Josefo** (trad. Whiston) | Fonte histórica, livre                                    |
| **Confissão de Westminster + Catecismos** | Assembleia de Westminster         | 1646–47, livre                                            |
| Credos e símbolos ecumênicos              | —                                 | Niceno, Atanasiano, etc. — livres                         |

---

## 7. Bíblias em domínio público (português) — o que é seguro

| Versão                  | Status             | Nota                                                  |
| ----------------------- | ------------------ | ----------------------------------------------------- |
| **Almeida 1819**        | Domínio público    | Base de todas as Almeida posteriores; fonte do BLIVRE |
| **Almeida 1681 / 1753** | Domínio público    | NT original de Almeida                                |
| **Almeida 1860**        | Domínio público    | Amplamente digitalizada                               |
| BLIVRE / NVA            | Livres (já no app) | Modernizações de base livre                           |
| ARA, NVI, ACF, NAA      | **Protegidas**     | Já marcadas como restritas no app — correto           |

Em grego/hebraico você já tem **Textus Receptus** e **WLC** (livres).

---

## 8. Estratégia para o português (o ponto que decide tudo)

O acervo teológico livre é quase todo em inglês. Para servir isso a um público
em português, sem infringir nada:

1. **Servir em inglês + resumo/tradução pela IA sob demanda.** O texto-fonte livre
   fica em inglês; a IA do TheoSphere traduz/resume o trecho na resposta. O
   original permanece intacto e livre.
2. **Traduzir os originais livres você mesmo (ou por equipe).** A **sua** tradução
   de uma obra em domínio público é uma obra nova, e o direito é **seu**. É o
   caminho mais valioso a longo prazo e vira diferencial da plataforma.
3. **Tradução assistida por IA do original livre**, com revisão humana. Cria um
   derivado que você controla. Rápido e barato; a qualidade exige revisão antes de
   virar acervo — encaixa no seu portão de qualidade.

Recomendação prática: comece **indexando os clássicos livres em inglês** (ganho
imediato, zero risco) e, em paralelo, priorize a **tradução própria** das 5–10
obras mais consultadas (Institutas via original livre, Agostinho, Matthew Henry).

---

## 9. Ação imediata no acervo atual

1. **Remover as 4 obras protegidas** já indexadas (Institutas ×3 de Cultura
   Cristã/Fiel e Hoekema — 12.699 trechos). São traduções modernas sob direito
   autoral. Some com o `scratch/remove-reprovadas.js` (ou um script equivalente,
   rodado no Mac — o sandbox não acessa o banco).
2. **Adicionar um portão de domínio público à ingestão.** Hoje o portão de
   qualidade aprova por **nota**, não por **direito autoral**. Uma obra pirata com
   nota 97 passa. É preciso um campo/checagem de licença (domínio público /
   licença aberta / licenciado) antes de indexar — senão o problema volta.
3. **Repovoar** a partir deste catálogo, começando pelos clássicos livres em
   inglês e pelas Bíblias Almeida antigas.

---

## Fontes

- [CCEL — Library of Congress](https://www.loc.gov/item/lcwaN0004026/) · [CCEL FAQ](https://www.ccel.org/info/faq) · [CCEL na Wikipédia](https://en.wikipedia.org/wiki/Christian_Classics_Ethereal_Library)
- [Comentários livres — StudyLight](https://www.studylight.org/commentaries.html) · [Jamieson-Fausset-Brown (CCEL)](https://www.ccel.org/j/jfb/jfb/JFB00H.htm) · [JFB na Wikipédia](https://en.wikipedia.org/wiki/Jamieson-Fausset-Brown_Bible_Commentary)
- [Léxicos — StudyLight](https://www.studylight.org/lexicons.html) · [Easton's 1897 (CCEL)](https://www.ccel.org/e/easton/ebd/ebd3.html) · [Dicionários — BibleHub](https://biblehub.com/dictionary/)
- [Ante-Nicene Fathers — Wikisource](https://en.wikisource.org/wiki/Ante-Nicene_Fathers) · [ANF01 (CCEL)](https://www.ccel.org/ccel/schaff/anf01.html) · [Nicene and Post-Nicene Fathers — Wikipédia](https://en.wikipedia.org/wiki/Nicene_and_Post-Nicene_Fathers)
- [Almeida 1819 — Wikisource](<https://pt.wikisource.org/wiki/Jo%C3%A3o_Ferreira_de_Almeida_(1819)>) · [Traduções da Bíblia em português — Wikipédia](https://pt.wikipedia.org/wiki/Tradu%C3%A7%C3%B5es_da_B%C3%ADblia_em_l%C3%ADngua_portuguesa)
- [Lista de obras de Santo Agostinho — Wikipédia](https://pt.wikipedia.org/wiki/Lista_de_obras_de_Santo_Agostinho)
