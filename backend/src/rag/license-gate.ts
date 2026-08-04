import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * license-gate.ts — portão de LICENÇA no runtime da ingestão.
 *
 * ── Por que existe ─────────────────────────────────────────────────────────
 * O portão de licença foi escrito em 01/08/2026 como script de curadoria
 * (`scratch/licencas.js`, usado por `ingest-next.js` e `purge-nao-livres.js`).
 * Só que a ingestão de produção não passa por ali: o
 * `audit/scripts/ingest-drive-library.sh` chama `POST /api/v1/drive-library/ingest`,
 * que caía direto no `DriveRagService` — sem nenhuma verificação de licença.
 *
 * Em 04/08/2026 isso deixou entrar a "Teologia Sistemática" (Franklin Ferreira
 * e Alan Myatt, obra protegida) com 3.180 trechos, reprovada no próprio portão.
 * Havia duas portas de ingestão e só uma tinha tranca. Este módulo põe a tranca
 * na outra.
 *
 * ── Fail-closed ────────────────────────────────────────────────────────────
 * O que não estiver explicitamente aprovado no manifesto NÃO entra. Ausência de
 * sinal é "não", nunca "pode" — inclusive quando o próprio manifesto está
 * ausente ou ilegível: nesse caso nada é indexado, e o erro é gritado no log.
 * Ler ausência como aprovação já custou caro duas vezes neste projeto.
 *
 * ── Fonte única ────────────────────────────────────────────────────────────
 * Lê o MESMO `scratch/licencas.json` que os scripts de curadoria usam. Nada de
 * segunda cópia: manifesto duplicado é manifesto que diverge, e divergir aqui
 * significa servir obra protegida achando que está tudo certo.
 */

/** Status que autorizam uso. Qualquer outro (ou ausência) = bloqueado. */
export const APROVADOS = new Set(['dominio-publico', 'licenciado']);

export interface LicenseDecision {
  ok: boolean;
  status: string;
  motivo: string | null;
}

interface ObraLicenca {
  status?: string;
  motivo?: string;
}

export interface LicenseManifest {
  obras: Record<string, ObraLicenca>;
  porNormal: Map<string, ObraLicenca>;
}

/**
 * Normaliza para comparação de nomes: sem acentos, minúsculas.
 * Os nomes vindos do Drive chegam em NFD — comparar cru gera falso negativo,
 * e falso negativo aqui bloqueia obra legítima.
 * Espelha `normaliza()` de `scratch/curadoria.js`.
 */
export function normaliza(s: unknown): string {
  return (typeof s === 'string' ? s : '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Caminhos onde o manifesto pode estar, em ordem de precedência.
 * `LICENSE_MANIFEST_PATH` permite apontar para outro lugar sem recompilar.
 */
function candidatePaths(): string[] {
  const fromEnv = process.env.LICENSE_MANIFEST_PATH;
  return [
    ...(fromEnv ? [fromEnv] : []),
    // cwd = backend/ quando roda via `npm start`
    path.resolve(process.cwd(), 'scratch/licencas.json'),
    // dist/rag/ → backend/scratch/
    path.resolve(__dirname, '../../scratch/licencas.json'),
    // src/rag/ → backend/scratch/ (ts-node, testes)
    path.resolve(__dirname, '../../../scratch/licencas.json'),
  ];
}

/**
 * Carrega o manifesto. Retorna `null` quando não existe ou não parseia —
 * e `null` significa bloquear tudo, nunca liberar tudo.
 */
export function carregarLicencas(): LicenseManifest | null {
  for (const arquivo of candidatePaths()) {
    try {
      if (!fs.existsSync(arquivo)) continue;
      const raw: unknown = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
      const obras =
        (raw as { obras?: Record<string, ObraLicenca> })?.obras ?? {};
      const porNormal = new Map<string, ObraLicenca>();
      for (const [chave, val] of Object.entries(obras)) {
        porNormal.set(normaliza(chave), val);
      }
      return { obras, porNormal };
    } catch {
      // Manifesto ilegível é tão grave quanto ausente — segue tentando os
      // outros caminhos e, no fim, bloqueia.
      continue;
    }
  }
  return null;
}

/**
 * Decide a licença de um arquivo do Drive.
 * Procura por fileId, depois nome exato, depois nome normalizado — a mesma
 * ordem de `scratch/licencas.js`, para que runtime e curadoria nunca discordem.
 */
export function licencaDe(
  file: { id?: string | null; name?: string | null },
  manifesto?: LicenseManifest | null,
): LicenseDecision {
  const m = manifesto ?? carregarLicencas();
  if (!m) {
    return {
      ok: false,
      status: 'sem-manifesto',
      motivo: 'scratch/licencas.json ausente ou ilegível',
    };
  }
  const achado =
    (file.id ? m.obras[file.id] : undefined) ??
    (file.name ? m.obras[file.name] : undefined) ??
    m.porNormal.get(normaliza(file.name));

  if (!achado) {
    return {
      ok: false,
      status: 'desconhecido',
      motivo: 'obra não consta em licencas.json',
    };
  }
  const status = achado.status ?? 'desconhecido';
  return { ok: APROVADOS.has(status), status, motivo: achado.motivo ?? null };
}
