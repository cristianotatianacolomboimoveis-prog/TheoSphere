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
};
