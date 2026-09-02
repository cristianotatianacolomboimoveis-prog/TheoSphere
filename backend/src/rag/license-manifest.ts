/**
 * license-manifest.ts — a decisão de licença de cada obra da biblioteca RAG.
 *
 * ── Por que isto é um módulo TypeScript, e não um JSON ─────────────────────
 * Até 04/08/2026 o manifesto era `scratch/licencas.json`, lido do disco em
 * tempo de execução. Em produção o arquivo não foi encontrado, o portão caiu
 * em fail-closed e barrou as 107 obras — inclusive as aprovadas. Proteção por
 * acidente não é proteção: no dia em que o caminho voltasse a resolver, a
 * garantia dependeria de novo de um arquivo estar no lugar certo do contêiner.
 *
 * Como módulo, o manifesto é compilado junto com o serviço. Não há caminho a
 * resolver, arquivo a copiar para o `dist`, nem diferença entre rodar local e
 * rodar no Render. Ele não pode faltar.
 *
 * ── Fonte única ────────────────────────────────────────────────────────────
 * Os scripts de curadoria (`scratch/licencas.js`) leem ESTE arquivo via
 * ts-node. Manifesto duplicado é manifesto que diverge, e divergir aqui
 * significa servir obra protegida achando que está tudo certo.
 *
 * ── Como liberar uma obra ──────────────────────────────────────────────────
 * Acrescente uma entrada com o nome EXATO do arquivo no Drive (ou o fileId) e
 * o status. Licença é decisão humana e jurídica: não se infere do autor. O
 * original das Institutas (Calvino, séc. XVI) é domínio público; a tradução
 * moderna da Cultura Cristã é obra nova e protegida. Filtrar por "Calvino"
 * aprovaria justamente a tradução protegida — por isso a decisão é por arquivo.
 */

/** Status que autorizam uso. Qualquer outro (ou ausência) = bloqueado. */
export const APROVADOS = new Set(['dominio-publico', 'licenciado']);

export type LicenseStatus = 'dominio-publico' | 'licenciado' | 'bloqueado';

export interface ObraLicenca {
  status: LicenseStatus;
  /** De onde vem a obra ou a edição usada (opcional, ajuda auditoria). */
  fonte?: string;
  /** Justificativa da decisão — obrigatória na prática, para haver rastro. */
  motivo: string;
}

/**
 * Chave = nome exato do arquivo no Drive, ou o fileId.
 * Fail-closed: obra ausente daqui NÃO é indexada nem servida.
 */
export const OBRAS: Readonly<Record<string, ObraLicenca>> = {
  // ── Bloqueadas: direito autoral vigente ─────────────────────────────────
  'Teologia Sistemática - Franklin Ferreira Alan Myatt.pdf': {
    status: 'bloqueado',
    motivo:
      'Obra de 2007 (Vida Nova), autores vivos — direito autoral vigente. ' +
      'Entrou por engano em 04/08/2026 pela API de ingestao, que na epoca nao ' +
      'consultava este manifesto; purgada e agora barrada no runtime.',
  },
  'Teologia - As institutas das Religiões Cristãs - Editora Fiel.pdf': {
    status: 'bloqueado',
    motivo: 'Traducao moderna Editora Fiel — direito autoral vigente',
  },
  'Teologia - As Institutas - Volume 1 - Editora Cultura Cristã.pdf': {
    status: 'bloqueado',
    motivo: 'Traducao moderna Cultura Crista — direito autoral vigente',
  },
  'Teologia - As Institutas - Volume 3 - Editora Cultura Cristã.pdf': {
    status: 'bloqueado',
    motivo: 'Traducao moderna Cultura Crista — direito autoral vigente',
  },
  'Anthony Hoekema - Linguas.pdf': {
    status: 'bloqueado',
    motivo: 'Autor/traducao sob direito autoral vigente',
  },

  // ── Bloqueada por curadoria, não por licença ────────────────────────────
  'Catecismo Menor de Westminster (P1-10) - dominio publico.docx': {
    status: 'bloqueado',
    motivo:
      'Substituido pela versao completa (107 perguntas); nao indexar o piloto parcial',
  },

  // ── Liberadas: domínio público ──────────────────────────────────────────
  'Catecismo Menor de Westminster (completo) - dominio publico.docx': {
    status: 'dominio-publico',
    fonte: 'Westminster Shorter Catechism (1647)',
    motivo:
      'Obra original de dominio publico; traducao propria do TheoSphere (107 perguntas)',
  },
  'Confissoes de Agostinho - Livro I parte 1 - dominio publico.docx': {
    status: 'dominio-publico',
    fonte:
      'Confessiones de Agostinho (c. 397); trad. inglesa livre de E. B. Pusey (1838), Project Gutenberg #3296',
    motivo:
      'Obra e fonte-base em dominio publico; traducao propria do TheoSphere (abertura do Livro I)',
  },
  'Confissoes de Agostinho - Livro I parte 2 - dominio publico.docx': {
    status: 'dominio-publico',
    fonte:
      'Confessiones de Agostinho (c. 397); trad. inglesa livre de E. B. Pusey (1838), Project Gutenberg #3296',
    motivo:
      'Obra e fonte-base em dominio publico; traducao propria do TheoSphere (conclusao do Livro I; partes 1+2 = Livro I completo)',
  },
  'The_Confessions_of_St_Augustine_gutenberg_3296.txt': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #3296',
    motivo: 'Versao completa em ingles de dominio público do Gutenberg',
  },
  'The_City_of_God_Volume_I_gutenberg_45304.txt': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #45304',
    motivo: 'Volume I de A Cidade de Deus em dominio público do Gutenberg',
  },
  'The_City_of_God_Volume_II_gutenberg_45305.txt': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #45305',
    motivo: 'Volume II de A Cidade de Deus em dominio público do Gutenberg',
  },
  'The_Confessions_of_St_Augustine_gutenberg_3296.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #3296',
    motivo:
      'Augustine, of Hippo, Saint — obra em domínio público (Project Gutenberg)',
  },
  'The_City_of_God_Volume_I_gutenberg_45304.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #45304',
    motivo:
      'Augustine, of Hippo, Saint — obra em domínio público (Project Gutenberg)',
  },
  'The_City_of_God_Volume_II_gutenberg_45305.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #45305',
    motivo:
      'Augustine, of Hippo, Saint — obra em domínio público (Project Gutenberg)',
  },
  'Confessions_of_St_Augustine_gutenberg_77585.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #77585',
    motivo:
      'Augustine, of Hippo, Saint — obra em domínio público (Project Gutenberg)',
  },
  'Writings_in_Connection_with_the_Donatist_Controversy_gutenberg_45843.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #45843',
    motivo:
      'Augustine, of Hippo, Saint — obra em domínio público (Project Gutenberg)',
  },
  'Letters_of_John_Calvin_Volume_II_Compiled_from_the_Original__gutenberg_45463.epub':
    {
      status: 'dominio-publico',
      fonte: 'Project Gutenberg #45463',
      motivo: 'Calvin, Jean — obra em domínio público (Project Gutenberg)',
    },
  'Letters_of_John_Calvin_Volume_I_Compiled_from_the_Original_M_gutenberg_45423.epub':
    {
      status: 'dominio-publico',
      fonte: 'Project Gutenberg #45423',
      motivo: 'Calvin, Jean — obra em domínio público (Project Gutenberg)',
    },
  'Creation_of_the_Teton_Landscape_The_Geologic_Story_of_Grand__gutenberg_52838.epub':
    {
      status: 'dominio-publico',
      fonte: 'Project Gutenberg #52838',
      motivo:
        'Reed, John C. (John Calvin) — obra em domínio público (Project Gutenberg)',
    },
  'The_Brothers_War_gutenberg_37890.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #37890',
    motivo:
      'Reed, John C. (John Calvin) — obra em domínio público (Project Gutenberg)',
  },
  'Anti-Pelagian_Writings_gutenberg_45844.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #45844',
    motivo:
      'Shedd, E. Cutler (Ephraim Cutler) — obra em domínio público (Project Gutenberg)',
  },
  'The_City_of_God_Vol_III_gutenberg_45305.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #45305',
    motivo:
      'Augustine, of Hippo, Saint — obra em domínio público (Project Gutenberg)',
  },
  'Summa_Theologica_Part_I_Prima_Pars_gutenberg_17897.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #17897',
    motivo:
      'Thomas, Aquinas, Saint — obra em domínio público (Project Gutenberg)',
  },
  'Summa_Theologica_Part_II-I_gutenberg_18755.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #18755',
    motivo:
      'Thomas, Aquinas, Saint — obra em domínio público (Project Gutenberg)',
  },
  'Summa_Theologica_Part_II-II_gutenberg_19981.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #19981',
    motivo: 'Duncan, Norman — obra em domínio público (Project Gutenberg)',
  },
  'Summa_Theologica_Part_III_gutenberg_20200.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #20200',
    motivo:
      'Mant, Alicia Catherine — obra em domínio público (Project Gutenberg)',
  },
  'Summa_Contra_Gentiles_Book_I_gutenberg_25274.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #25274',
    motivo: 'Abbott, Jacob — obra em domínio público (Project Gutenberg)',
  },
  'Summa_Theologica_Part_I_Prima_Pars_gutenberg_17611.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #17611',
    motivo:
      'Thomas, Aquinas, Saint — obra em domínio público (Project Gutenberg)',
  },
  'Summa_Theologica_Part_I-II_Pars_Prima_Secundae_gutenberg_17897.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #17897',
    motivo:
      'Thomas, Aquinas, Saint — obra em domínio público (Project Gutenberg)',
  },
  'Summa_Theologica_Part_II-II_Secunda_Secundae_gutenberg_18755.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #18755',
    motivo:
      'Thomas, Aquinas, Saint — obra em domínio público (Project Gutenberg)',
  },
  'Summa_Theologica_Part_III_Tertia_Pars_gutenberg_19950.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #19950',
    motivo:
      'Thomas, Aquinas, Saint — obra em domínio público (Project Gutenberg)',
  },
  'Institutes_of_the_Christian_Religion_Vol_I_gutenberg_45001.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #45001',
    motivo: 'Calvin, Jean — obra em domínio público (Project Gutenberg)',
  },
  'Institutes_of_the_Christian_Religion_Vol_II_gutenberg_64392.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #64392',
    motivo: 'Calvin, Jean — obra em domínio público (Project Gutenberg)',
  },
  'Letters_of_John_Calvin_Volume_II_gutenberg_45463.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #45463',
    motivo: 'Calvin, Jean — obra em domínio público (Project Gutenberg)',
  },
  'Martin_Luthers_Large_Catechism_gutenberg_1722.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #1722',
    motivo: 'Luther, Martin — obra em domínio público (Project Gutenberg)',
  },
  'Luthers_Little_Instruction_Book_The_Small_Catechism_gutenberg_1670.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #1670',
    motivo: 'Luther, Martin — obra em domínio público (Project Gutenberg)',
  },
  'Homilies_on_the_Gospel_of_St_John_gutenberg_19038.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #19038',
    motivo: 'John Chrysostom — obra em domínio público (Project Gutenberg)',
  },
  'Homilies_on_the_Epistles_of_Paul_to_the_Corinthians_gutenberg_17723.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #17723',
    motivo: 'Various — obra em domínio público (Project Gutenberg)',
  },
  'On_the_Priesthood_gutenberg_32055.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #32055',
    motivo: 'Sohl, Jerry — obra em domínio público (Project Gutenberg)',
  },
  'Cur_Deus_Homo_Why_God_Became_Man_gutenberg_36907.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #36907',
    motivo: 'Douglas, Amanda M. — obra em domínio público (Project Gutenberg)',
  },
  'A_Treatise_Concerning_Religious_Affections_gutenberg_14867.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #14867',
    motivo:
      'Ellinwood, Frank F. (Frank Field) — obra em domínio público (Project Gutenberg)',
  },
  'Sinners_in_the_Hands_of_an_Angry_God_gutenberg_32011.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #32011',
    motivo: 'Knight, Damon — obra em domínio público (Project Gutenberg)',
  },
  'All_of_Grace_gutenberg_27530.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #27530',
    motivo:
      'Brooke, L. Leslie (Leonard Leslie) — obra em domínio público (Project Gutenberg)',
  },
  'The_Works_of_John_Wesley_Vol_1_gutenberg_59789.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #59789',
    motivo:
      'Morton, Samuel George — obra em domínio público (Project Gutenberg)',
  },
  'Against_Heresies_gutenberg_9804.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #9804',
    motivo: 'Ruskin, John — obra em domínio público (Project Gutenberg)',
  },
  'Apology_gutenberg_7098.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #7098',
    motivo:
      'Higginson, Thomas Wentworth — obra em domínio público (Project Gutenberg)',
  },
  'The_Stromata_Miscellanies_gutenberg_3239.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #3239',
    motivo: 'MacGrath, Harold — obra em domínio público (Project Gutenberg)',
  },
  'On_the_Incarnation_of_the_Word_gutenberg_32999.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #32999',
    motivo: 'Various — obra em domínio público (Project Gutenberg)',
  },
  'Of_the_Imitation_of_Christ_gutenberg_59353.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #59353',
    motivo:
      'Andriessen, Suze (Suzanna Maria) — obra em domínio público (Project Gutenberg)',
  },
  'The_Pilgrims_Progress_gutenberg_39452.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #39452',
    motivo: 'Bunyan, John — obra em domínio público (Project Gutenberg)',
  },
  'Lectures_to_My_Students_gutenberg_19039.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #19039',
    motivo: 'Cantù, Cesare — obra em domínio público (Project Gutenberg)',
  },
  'Morning_and_Evening_gutenberg_1967.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #1967',
    motivo: 'Balzac, Honoré de — obra em domínio público (Project Gutenberg)',
  },
  'Sermons_on_Several_Occasions_gutenberg_41785.epub': {
    status: 'dominio-publico',
    fonte: 'Project Gutenberg #41785',
    motivo: 'Bayley, Harold — obra em domínio público (Project Gutenberg)',
  },
  // ── Bloco 1: Obras Adicionais do Google Drive (CCEL/StudyLight) ───────────
  'Commentary_on_the_Whole_Bible_Matthew_Henry.epub': {
    status: 'dominio-publico',
    fonte: 'CCEL / StudyLight',
    motivo:
      'Obra de domínio público (comentários bíblicos clássicos de Matthew Henry)',
  },
  'Commentary_on_the_Whole_Bible_Vol_1_gutenberg_90001.txt': {
    status: 'dominio-publico',
    fonte: 'CCEL / StudyLight',
    motivo:
      'Obra de domínio público (comentários bíblicos clássicos de Matthew Henry Vol 1)',
  },
  'Commentary_on_the_Whole_Bible_Vol_2_gutenberg_90002.txt': {
    status: 'dominio-publico',
    fonte: 'CCEL / StudyLight',
    motivo:
      'Obra de domínio público (comentários bíblicos clássicos de Matthew Henry Vol 2)',
  },
  'Commentary_on_the_Whole_Bible_Vol_3_gutenberg_90003.txt': {
    status: 'dominio-publico',
    fonte: 'CCEL / StudyLight',
    motivo:
      'Obra de domínio público (comentários bíblicos clássicos de Matthew Henry Vol 3)',
  },
  'Commentary_on_the_Whole_Bible_Vol_4_gutenberg_90004.txt': {
    status: 'dominio-publico',
    fonte: 'CCEL / StudyLight',
    motivo:
      'Obra de domínio público (comentários bíblicos clássicos de Matthew Henry Vol 4)',
  },
  'Commentary_on_the_Whole_Bible_Vol_5_gutenberg_90005.txt': {
    status: 'dominio-publico',
    fonte: 'CCEL / StudyLight',
    motivo:
      'Obra de domínio público (comentários bíblicos clássicos de Matthew Henry Vol 5)',
  },
  'Commentary_on_the_Whole_Bible_Vol_6_gutenberg_90006.txt': {
    status: 'dominio-publico',
    fonte: 'CCEL / StudyLight',
    motivo:
      'Obra de domínio público (comentários bíblicos clássicos de Matthew Henry Vol 6)',
  },
  'Exposition_of_the_Bible_John_Gill.epub': {
    status: 'dominio-publico',
    fonte: 'StudyLight',
    motivo:
      'Obra de domínio público (Exposition of the Entire Bible de John Gill)',
  },
  'Eastons_Bible_Dictionary.epub': {
    status: 'dominio-publico',
    fonte: 'CCEL',
    motivo: 'Obra de domínio público (Dicionário Bíblico de M.G. Easton)',
  },
  'Eastons_Bible_Dictionary_gutenberg_90007.txt': {
    status: 'dominio-publico',
    fonte: 'CCEL / Archive.org',
    motivo: 'Obra de domínio público (Dicionário Bíblico de M.G. Easton)',
  },
  'Notes_on_the_Bible_Albert_Barnes.epub': {
    status: 'dominio-publico',
    fonte: 'StudyLight',
    motivo: 'Obra de domínio público (Notes on the Bible de Albert Barnes)',
  },
  'Jamieson_Fausset_Brown_Commentary.epub': {
    status: 'dominio-publico',
    fonte: 'CCEL',
    motivo:
      'Obra de domínio público (Commentary Critical and Explanatory de Jamieson, Fausset & Brown)',
  },
  'Ante_Nicene_Fathers.epub': {
    status: 'dominio-publico',
    fonte: 'CCEL / Wikisource',
    motivo: 'Coleção histórica de domínio público (Pais Ante-Nicenos)',
  },
  'Nicene_Post_Nicene_Fathers.epub': {
    status: 'dominio-publico',
    fonte: 'CCEL',
    motivo: 'Coleção histórica de domínio público (Pais Nicenos e Pós-Nicenos)',
  },
};
