# Verificação de Licença — Septuaginta Grega (LXX Brenton)

**Data da Verificação:** 2026-11-07  
**Status do Portão de Licença (Fail-Closed):** APROVADA (`Public Domain`)

---

## 1. Avaliação das Candidatas Lidas na Fonte

| Candidata | URL da Fonte Verificada | Licença Lida na Fonte | Decisão Fail-Closed |
|---|---|---|---|
| **Swete** (`nathans/lxx-swete` / `First1KGreek`) | https://raw.githubusercontent.com/nathans/lxx-swete/master/README.md | **CC BY-SA 4.0** (*"The Greek text and its annotations in the data directory are published under the terms of the Creative Commons Attribution-ShareAlike 4.0 International"*) | **REJEITADA** (ShareAlike incompatível com a regra 2) |
| **Swete** (`eliranwong/LXX-Swete-1930`) | https://github.com/eliranwong/LXX-Swete-1930/blob/master/LICENSE | **GPL-3.0** | **REJEITADA** (Copyleft GPL) |
| **Rahlfs 1935 / Rahlfs-Hanhart 2006** | Deutsche Bibelgesellschaft / CCAT | Direitos reservados pela Deutsche Bibelgesellschaft (edição revisada 2006) e restrição acadêmica CCAT | **REJEITADA** |
| **Brenton Septuagint (`grcbrent`) — eBible.org** | https://ebible.org/find/details.php?id=grcbre e https://ebible.org/grcbrent/copyright.htm | **Public Domain** (*"μετάφραση των εβδομήκοντα — The Greek Septuagint with Apocrypha, compiled by Sir Lancelot C. L. Brenton — Public Domain"*) | **APROVADA** (Domínio Público) |

---

## 2. Evidência Documental da Fonte Aprovada (`grcbrent`)

- **Obra original:** *The Septuagint Version of the Old Testament, according to the Vatican Text*, compilada por Sir Lancelot Charles Lee Brenton (1807–1862), publicada por Samuel Bagster & Sons, Londres, 1851.
- **Pacote digital utilizado:** `https://ebible.org/Scriptures/grcbrent_vpl.zip` (atualizado em 2026-11-04).
- **Declaração literal em `grcbrent_about.htm` / `copr.htm` no arquivo distribuído:**
  ```html
  <h1 class='dejavu_serif'>μετάφραση των εβδομήκοντα</h1>
  <h2>The Greek Septuagint with Apocrypha, compiled by Sir Lancelot C. L. Brenton</h2>
  <p><a href='http://en.wikipedia.org/wiki/Public_domain'>Public Domain</a><br />
  Language: <a href='http://www.ethnologue.org/language/grc' class='dejavu_serif' target='_blank'>Ἑλληνική (Greek, Ancient)</a><br />
  Dialect: Koine<br />
  </p>
  ```

---

## 3. Escopo Canônico e Versificação

- **39 livros canônicos do Antigo Testamento (`bookId` 1 a 39):**
  - Total de linhas canônicas na fonte (`grcbrent_vpl.txt`): **23.228**.
  - Sub-versículos com sufixo alfabético (ex.: `GEN 31:50a`, `1KI 2:35a..35o`, `ESG 8:12a..12x`, `PSA 115:4a`, `PSA 144:13a`) mesclados ao versículo inteiro base preservando a marcação `[NNa]`: **286**.
  - Total de versículos inteiros no banco (`BibleVerse`, `translation = 'LXX'`): **22.942** (`23.228 - 286 = 22.942`, diferença inexplicada = 0).
  - Na Septuaginta de Brenton, Esdras B (`EZR`) agrupa Esdras (`capítulos 1–10` → `bookId = 15, Esdras`) e Neemias (`capítulos 11–23` → `bookId = 16, Neemias, capítulos 1–13`).
- **Livros deuterocanônicos/apócrifos presentes no arquivo `grcbrent_vpl.txt` e não ingeridos na grade protestante de 66 livros:**
  - `TOB` (Tobias, 245 vv.), `JDT` (Judite, 339 vv.), `WIS` (Sabedoria, 436 vv.), `SIR` (Eclesiástico/Sirácida, 1.370 vv.), `BAR` (Baruque, 140 vv.), `EPJ` (Epístola de Jeremias, 73 vv.), `SUS` (Susana, 64 vv.), `BEL` (Bel e o Dragão, 42 vv.), `1MA` (1 Macabeus, 924 vv.), `2MA` (2 Macabeus, 555 vv.), `1ES` (1 Esdras / Esdras A, 448 vv.), `PRM` (Oração de Manassés, 15 vv.), `3MA` (3 Macabeus, 228 vv.), `4MA` (4 Macabeus, 483 vv.) e `PSA 151` (Salmo 151, 7 vv.) — totalizando 5.369 linhas fora do cânon de 39 livros do AT.
- **Esquema de versificação:** Segue integralmente a numeração da LXX mapeada em `versification.ts` (Salmos 9–10 unidos no Salmo 9:1–39 com título no v.1; Salmos 114–115 no Salmo 113; Salmo 116 dividido em 114 e 115; Salmo 147 dividido em 146 e 147; títulos contados como v.1 e v.1–2; Joel 3–4; Malaquias 3:19–24; Números 16:1–35 e 17:1–28).
