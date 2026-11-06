import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * O backend NÃO tem `setGlobalPrefix`: cada controller declara `api/v1/...` no
 * próprio @Controller. O frontend monta toda chamada sobre
 * `CONFIG.API_BASE_URL` (= `<backend>/api/v1`).
 *
 * Defeito achado em 2026-11-06: os controllers de anotações e billing (Fase 0)
 * nasceram sem o prefixo. Os testes unitários passavam (chamam o controller
 * direto), mas em produção `/api/v1/annotations` respondia 404 e as anotações
 * nunca sincronizavam. Este teste barra o próximo controller sem prefixo.
 */
const SRC = join(__dirname, '..');

// Exceções com motivo. Qualquer outra rota fora de api/v1 é defeito.
const ALLOWED_OUTSIDE_API_V1: Record<string, string> = {
  'app.controller.ts': 'rotas de raiz (status/robots), sem consumo pelo app',
  'mcp/mcp.controller.ts':
    'endpoint MCP consumido por clientes externos em /mcp',
  'mcp/mcp.answer.controller.ts': 'idem MCP',
  'mcp/mcp.execution.controller.ts': 'idem MCP',
};

function listControllers(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listControllers(full);
    return name.endsWith('.controller.ts') ? [full] : [];
  });
}

describe('Prefixo de rotas (api/v1)', () => {
  const controllers = listControllers(SRC);

  it('encontra os controllers do projeto (o teste não está olhando para o vazio)', () => {
    expect(controllers.length).toBeGreaterThan(15);
  });

  it('todo @Controller consumido pelo app começa com api/v1', () => {
    const offenders: string[] = [];
    for (const file of controllers) {
      const rel = relative(SRC, file);
      if (ALLOWED_OUTSIDE_API_V1[rel]) continue;
      const source = readFileSync(file, 'utf8');
      const paths = [
        ...source.matchAll(/@Controller\(\s*(['"`])([^'"`]*)\1/g),
      ].map((m) => m[2]);
      const bare = /@Controller\(\s*\)/.test(source) ? [''] : [];
      for (const p of [...paths, ...bare]) {
        if (!p.startsWith('api/v1')) offenders.push(`${rel} → '${p}'`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
