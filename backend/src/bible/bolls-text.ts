/**
 * Limpeza do texto devolvido pela bolls.life.
 *
 * Defeito achado em 2026-11-08: a KJV da bolls.life vem com números de Strong
 * em tags (`God<S>2316</S>`). O antigo `stripHtml` removia só as tags e
 * deixava o número grudado na palavra, e o leitor mostrava
 * "For1063 God2316 so3779 loved25…" em 30.459 dos 30.470 versículos.
 *
 * Aqui o CONTEÚDO de <S> (Strong), <m> (morfologia) e <sup> (marcas de nota)
 * é descartado antes de remover as demais tags.
 */
export function cleanBollsText(html: string): string {
  return (html ?? '')
    .replace(/<S>[^<]*<\/S>/gi, '')
    .replace(/<m>[^<]*<\/m>/gi, '')
    .replace(/<sup>[\s\S]*?<\/sup>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>?/g, '')
    .replace(/\s+([,.;:!?·])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
