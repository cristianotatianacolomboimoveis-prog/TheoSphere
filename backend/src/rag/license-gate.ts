import { APROVADOS, OBRAS, type ObraLicenca } from './license-manifest';

/**
 * license-gate.ts — portão de LICENÇA no runtime da ingestão.
 *
 * ── Por que existe ─────────────────────────────────────────────────────────
 * O portão foi escrito em 01/08/2026 como script de curadoria
 * (`scratch/licencas.js`, usado por `ingest-next.js` e `purge-nao-livres.js`).
 * Só que a ingestão de produção não passava por ali: o
 * `audit/scripts/ingest-drive-library.sh` chama `POST /api/v1/drive-library/ingest`,
 * que caía direto no `DriveRagService` — sem nenhuma verificação de licença.
 * Havia duas portas e só uma tinha tranca. Em 04/08/2026 isso deixou entrar a
 * "Teologia Sistemática" (obra protegida) com milhares de trechos.
 *
 * ── Fail-closed ────────────────────────────────────────────────────────────
 * O que não estiver explicitamente aprovado NÃO entra. Ausência de sinal é
 * "não", nunca "pode". Ler ausência como aprovação já custou caro duas vezes
 * neste projeto — uma com tradução automática, outra com direito autoral.
 *
 * O manifesto vem de `license-manifest.ts`, compilado junto com o serviço:
 * não há arquivo a encontrar em disco, então o portão não tem como falhar por
 * motivo de ambiente. Ver a justificativa naquele arquivo.
 */

export interface LicenseDecision {
  ok: boolean;
  status: string;
  motivo: string | null;
}

/**
 * Normaliza para comparação de nomes: sem acentos, minúsculas.
 * Os nomes vindos do Drive chegam em NFD — comparar cru gera falso negativo,
 * e falso negativo aqui bloqueia obra legítima.
 * Espelha `normaliza()` de `scratch/curadoria.js`.
 */
export function normaliza(valor: unknown): string {
  return (typeof valor === 'string' ? valor : '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Índice por nome normalizado, montado uma vez no carregamento do módulo. */
const POR_NOME_NORMALIZADO: ReadonlyMap<string, ObraLicenca> = new Map(
  Object.entries(OBRAS).map(([chave, valor]) => [normaliza(chave), valor]),
);

/**
 * Decide a licença de um arquivo do Drive.
 *
 * Procura por fileId, depois nome exato, depois nome normalizado — a mesma
 * ordem usada pelos scripts de curadoria, para que runtime e curadoria nunca
 * discordem sobre a mesma obra.
 *
 * @param obras  Override do manifesto, só para testes.
 */
export function licencaDe(
  file: { id?: string | null; name?: string | null },
  obras: Readonly<Record<string, ObraLicenca>> = OBRAS,
): LicenseDecision {
  const porNome =
    obras === OBRAS
      ? POR_NOME_NORMALIZADO
      : new Map(Object.entries(obras).map(([k, v]) => [normaliza(k), v]));

  const achado =
    (file.id ? obras[file.id] : undefined) ??
    (file.name ? obras[file.name] : undefined) ??
    porNome.get(normaliza(file.name));

  if (!achado) {
    return {
      ok: false,
      status: 'desconhecido',
      motivo: 'obra não consta no manifesto de licenças',
    };
  }
  return {
    ok: APROVADOS.has(achado.status),
    status: achado.status,
    motivo: achado.motivo ?? null,
  };
}

export { APROVADOS, OBRAS };
