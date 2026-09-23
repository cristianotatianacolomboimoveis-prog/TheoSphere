# Acervo Global em Domínio Público e Recursos Livres — TheoSphere

> **Diretriz Constitucional do TheoSphere:**
> O TheoSphere opera exclusivamente com **obras em domínio público mundial** e **dados/softwares sob licenças livres permissivas**.
> Todo o acervo é submetido ao portão de licença *fail-closed* (`src/rag/license-manifest.ts`). Qualquer recurso cuja autorização ou prazo de domínio público não esteja documentalmente comprovado é terminantemente barrado. Obras de editoras comerciais modernas são proibidas no ecossistema.

---

## 1. Princípios Jurídicos e Portão Fail-Closed

1. **Marco Temporal Internacional (EUA):** Obras publicadas antes de **1929** estão em domínio público pleno em todo o mundo.
2. **Marco Temporal Brasileiro (Lei 9.610/98, art. 41):** Obras cujo autor (e tradutor, se houver) faleceu há mais de **70 anos** (contados a partir de 1º de janeiro do ano seguinte ao falecimento).
3. **Traduções Livres vs. Traduções Protegidas:**
   - Originais clássicos (ex: Agostinho em latim ~400 d.C., Calvino em francês/latim 1536) são de domínio público.
   - Traduções modernas feitas por editoras comerciais (ex: Cultura Cristã, Fiel, Vida Nova, CPAD) são obras derivadas protegidas por direitos autorais vigentes e estão **bloqueadas**.
   - Aceitamos exclusivamente:
     - Traduções clássicas em domínio público (ex: Henry Beveridge 1845, Philip Schaff 1886, Alexander Roberts 1885, E. B. Pusey 1838);
     - Traduções históricas em português de domínio público (Bíblia Almeida 1819/1860);
     - Traduções próprias geradas e curadas internamente pela IA do TheoSphere sobre os originais livres.

---

## 2. As Grandes Fontes Mundiais Mapeadas

| Fonte | Descrição & Escopo | Acesso Técnico & Formatos | Licença / Status |
| :--- | :--- | :--- | :--- |
| **CCEL** (*Christian Classics Ethereal Library*) | O maior repositório teológico do mundo (Calvin Univ.). Mais de 2.000 obras completas. | ThML (XML teológico), EPUB, Plain Text | Domínio Público Mundial |
| **The SWORD Project** (*CrossWire Bible Society*) | Módulos abertos de bíblias, comentários verso a verso e léxicos em 50+ línguas. | JSword, RawCom, OSIS XML, JSON | Permissivo / Domínio Público |
| **Project Gutenberg** | Biblioteca global com mais de 70.000 livros em domínio público. | API Gutendex, TXT UTF-8, EPUB | Domínio Público Mundial |
| **Historical Christian Faith** | Banco de dados de comentários patrísticos e da Reforma organizados verso a verso. | JSON / Markdown com links CCEL | Dados Abertos / CC0 |
| **PRDL** (*Post-Reformation Digital Library*) | Mais de 145.000 volumes digitalizados dos séculos XVI a XVIII. | Scans e documentos históricos | Domínio Público |
| **Open Scriptures / STEPBible** | Textos hebraicos e gregos com concordância Strong, léxicos BDB, Thayer e morfologia. | OSIS XML, JSON, CSV | Licenças Abertas (CC-BY / Public Domain) |
| **Internet Archive & Wikisource** | Digitalizações históricas de Princeton Theological Seminary, Harvard Divinity School, etc. | Plain Text, DjVu, PDF pré-1929 | Domínio Público |

---

## 3. Catálogo Sistemático das Principais Obras Livres

### A. Patrística Completa (Coleção Philip Schaff — 38 Volumes)
- **Ante-Nicene Fathers (ANF) — 10 Volumes:**
  1. *Volume 1:* As Epístolas Apostólicas, Justino Mártir e Irineu de Lyon (*Contra Heresias*).
  2. *Volume 2:* Hermas, Taciano, Atenágoras, Teófilo e Clemente de Alexandria (*Stromata*, *Pedagogo*).
  3. *Volume 3:* Tertuliano (Parte 1: *Apologia*, Tratados doutrinários e morais).
  4. *Volume 4:* Tertuliano (Parte 2), Minúcio Félix, Cómodo e Orígenes (*De Principiis*, *Contra Celso*).
  5. *Volume 5:* Hipólito, Cipriano de Cartago, Caio e Novaciano.
  6. *Volume 6:* Gregório Taumaturgo, Dionísio de Alexandria, Metódio e Arnóbio.
  7. *Volume 7:* Lactâncio, Cânones dos Apóstolos e Constituições Apostólicas.
  8. *Volume 8:* Os Testamentos dos Doze Patriarcas, Didaquê e Apócrifos Históricos.
  9. *Volume 9:* Obras descobertas recentemente, Comentários aos Evangelhos de Orígenes.
  10. *Volume 10:* Índice Geral, Bibliografia e Referências Canônicas.

- **Nicene and Post-Nicene Fathers (NPNF Série 1) — 14 Volumes:**
  - *Vols. 1 a 8 — Santo Agostinho:*
    - Vol. 1: *Confissões* e *Cartas*.
    - Vol. 2: *A Cidade de Deus* e *Sobre a Doutrina Cristã*.
    - Vol. 3: *Sobre a Santíssima Trindade* e *Tratados Teológicos*.
    - Vol. 4: *Tratados Anti-Maniqueus* e *Anti-Donatistas*.
    - Vol. 5: *Tratados Anti-Pelagianos*.
    - Vol. 6: Sermão da Montanha e Harmonia dos Evangelhos.
    - Vol. 7: Homilias sobre o Evangelho de João e 1 João.
    - Vol. 8: Exposição dos Salmos (*Enarrationes in Psalmos*).
  - *Vols. 9 a 14 — São João Crisóstomo:*
    - Vol. 9: Tratado sobre o Sacerdócio, Tratados ascéticos e Homilias seletas.
    - Vol. 10: Homilias sobre o Evangelho de São Mateus (90 homilias).
    - Vol. 11: Homilias sobre os Atos dos Apóstolos e Epístola aos Romanos.
    - Vol. 12: Homilias sobre 1ª e 2ª Coríntios.
    - Vol. 13: Homilias sobre Gálatas, Efésios, Filipenses, Colossenses, Tessalonicenses.
    - Vol. 14: Homilias sobre o Evangelho de João e Epístola aos Hebreus.

- **Nicene and Post-Nicene Fathers (NPNF Série 2) — 14 Volumes:**
  - Vol. 1: Eusébio de Cesareia (*História Eclesiástica*, *Vida de Constantino*).
  - Vol. 2: Sócrates e Sozomeno (*Histórias Eclesiásticas*).
  - Vol. 3: Teodoreto, Jerônimo e Genádio.
  - Vol. 4: Santo Atanásio (*Sobre a Encarnação do Verbo*, *Discursos contra os Arianos*).
  - Vol. 5: Gregório de Nissa.
  - Vol. 6: São Jerônimo (*Cartas*, tratados seletos e biografias).
  - Vol. 7: Cirilo de Jerusalém e Gregório de Nazianzo.
  - Vol. 8: São Basílio Magno (*Sobre o Espírito Santo*, Homilias e Cartas).
  - Vol. 9: Hilário de Poitiers e João Damasceno (*Exposição da Fé Ortodoxa*).
  - Vol. 10: Santo Ambrósio de Milão (*Sobre os Deveres do Clero*, *Sobre os Mistérios*).
  - Vol. 11: Sulpício Severo, Vicente de Lérins e João Cassiano.
  - Vol. 12: Papa Gregório Magno (Livros I a VIII).
  - Vol. 13: Papa Gregório Magno (Livros IX a XIV) e Efrém da Síria.
  - Vol. 14: Os Cânones e Decretos dos Sete Concílios Ecumênicos.

---

### B. Escolástica e Filosofia Cristã Medieval
1. **Tomás de Aquino:**
   - *Summa Theologiae* (completa — Prima Pars, Pars Prima Secundae, Pars Secunda Secundae, Tertia Pars), tradução livre dos Padres Dominicanos Ingleses (1911).
   - *Summa Contra Gentiles* (Livros I a IV).
2. **Anselmo de Cantuária:**
   - *Cur Deus Homo* (*Por que Deus se Fez Homem*).
   - *Proslogion* e *Monologion* (argumento ontológico).
3. **Tomás de Kempis:**
   - *Da Imitação de Cristo* (séc. XV, universalmente livre).

---

### C. Grandes Clássicos da Reforma Protestante
1. **João Calvino:**
   - *Institutas da Religião Cristã* (edição canônica de 1559, tradução histórica de Henry Beveridge 1845).
   - *Comentários Bíblicos Completos* (45 volumes cobrindo quase todo o cânon bíblico — Calvin Translation Society).
   - *Cartas de João Calvino* (volumes históricos compilados).
2. **Martinho Lutero:**
   - *O Catecismo Maior* e *O Catecismo Menor* (1529).
   - *Comentário à Epístola aos Gálatas* (1535).
   - *O Cativeiro Babilônico da Igreja* (1520).
   - *Da Liberdade do Cristão* (1520).
   - *As 95 Teses contra as Indulgências* (1517).
3. **Símbolos de Fé Históricos:**
   - *Confissão de Fé de Westminster* (1647), *Catecismo Maior* e *Catecismo Menor*.
   - *Catecismo de Heidelberg* (1563).
   - *Cânones de Dort* (1618–1619).
   - *Segunda Confissão Helvética* (1566).

---

### D. Literatura Puritana e Pós-Reforma
1. **John Bunyan:**
   - *O Peregrino* (*The Pilgrim's Progress*, 1678).
   - *A Guerra Santa* (*The Holy War*, 1682).
   - *Graça Abundante ao Principal dos Pecadores* (*Grace Abounding to the Chief of Sinners*, 1666).
2. **John Owen:**
   - *The Death of Death in the Death of Christ* (1647).
   - *On the Mortification of Sin in Believers* (1656).
   - *Pneumatologia: Um Discurso sobre o Espírito Santo* (1674).
3. **Jonathan Edwards:**
   - *A Treatise Concerning Religious Affections* (1746).
   - *Freedom of the Will* (1754).
   - Sermões clássicos (*Sinners in the Hands of an Angry God*, 1741).
4. **Richard Baxter:**
   - *The Reformed Pastor* (1656).
   - *The Saints' Everlasting Rest* (1650).
5. **John Foxe:**
   - *Foxe's Book of Martyrs* (*O Livro dos Mártires*, 1563).
6. **Flávio Josefo:**
   - *Antiguidades dos Judeus* (*Antiquities of the Jews*, tradução de William Whiston 1737).
   - *A Guerra dos Judeus* (*The Wars of the Jews*).

---

### E. Comentários Bíblicos Verso a Verso
1. **Matthew Henry:** *Commentary on the Whole Bible* (6 volumes integrais, Gênesis a Apocalipse, ~1710).
2. **John Gill:** *An Exposition of the Old and New Testaments* (9 volumes, séc. XVIII).
3. **Jamieson, Fausset & Brown (JFB):** *Commentary Critical, Experimental, and Practical on the Old and New Testaments* (1871).
4. **Albert Barnes:** *Notes on the Old and New Testaments* (14 volumes, 1832–1872).
5. **Adam Clarke:** *A Commentary and Critical Notes on the Bible* (6 volumes, 1810–1826).
6. **Keil & Delitzsch:** *Biblical Commentary on the Old Testament* (10 volumes).
7. **Geneva Bible Footnotes:** Notas originais dos reformadores genebrinos (1599).

---

### F. Dicionários Bíblicos, Léxicos e Enciclopédias
1. **Easton's Bible Dictionary:** Matthew George Easton (1897 — 4.000 verbetes enciclopédicos).
2. **Smith's Bible Dictionary:** William Smith (1884).
3. **ISBE** (*International Standard Bible Encyclopedia*): James Orr (1915 — 5 volumes completos).
4. **Strong's Exhaustive Concordance:** James Strong (1890).
5. **Thayer's Greek-English Lexicon:** Joseph Henry Thayer (1889).
6. **Brown-Driver-Briggs (BDB):** Francis Brown, S. R. Driver, Charles A. Briggs (1906).

---

### G. Avivamentos e Teologia Sistemática do Século XIX
1. **Charles Haddon Spurgeon:**
   - *Metropolitan Tabernacle Pulpit* (mais de 3.500 sermões integrais).
   - *Treasury of David* (comentário exaustivo e homilético dos 150 Salmos).
   - *Lectures to My Students* (1875).
   - *All of Grace* (1886).
   - *Morning and Evening* (devocional diário clássico).
2. **John Wesley:**
   - *Sermons on Several Occasions* (141 sermões padrão do Metodismo).
   - *Explanatory Notes Upon the New Testament* (1755).
3. **Charles Hodge:**
   - *Systematic Theology* (3 volumes, 1871 — obra magna do Seminário de Princeton).
4. **Augustus Hopkins Strong:**
   - *Systematic Theology* (1907).

---

## 4. Pipeline Técnico de Ingestão do TheoSphere

O TheoSphere processa esses acervos através do pipeline de ingestão automatizado:

```
[Repositório Aberto] ──> [Download / Validação de Licença] ──> [Sanitização & Normalização]
        ──> [Chunking Semântico: 500 palavras] ──> [Embeddings: Gemini 768d] 
        ──> [PostgreSQL: UserEmbedding (HNSW)] ──> [Busca Híbrida & RAG Copilot]
```

- **Verificação de Duplicação Prévia:** O pipeline consulta previamente se cada chunk (`gutenberg_${id}_chunk_${index}`) já foi inserido no banco de dados, evitando chamadas de API ou consumo de cota desnecessário.
- **Fail-Closed Gatekeeper:** Nenhuma obra é inserida sem registro explícito no `license-manifest.ts`.
