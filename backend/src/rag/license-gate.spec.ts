import { licencaDe, normaliza, APROVADOS } from './license-gate';
import type { LicenseManifest } from './license-gate';

/**
 * O portão de licença é fail-closed: o que não está explicitamente aprovado
 * não entra. Estes testes existem porque a versão anterior deste portão vivia
 * só nos scripts de curadoria, e a API de ingestão passava por fora dele —
 * deixando entrar uma obra protegida com 3.180 trechos em 04/08/2026.
 */
function manifesto(
  obras: Record<string, { status?: string; motivo?: string }>,
): LicenseManifest {
  const porNormal = new Map<string, { status?: string; motivo?: string }>();
  for (const [k, v] of Object.entries(obras)) porNormal.set(normaliza(k), v);
  return { obras, porNormal };
}

describe('license-gate', () => {
  const m = manifesto({
    'Agostinho - Confissoes.docx': {
      status: 'dominio-publico',
      motivo: 'Século IV; tradução livre',
    },
    'Teologia Sistemática - Franklin Ferreira Alan Myatt.pdf': {
      status: 'bloqueado',
      motivo: 'Direito autoral vigente',
    },
    'Obra Licenciada.pdf': { status: 'licenciado' },
    'file-id-puro': { status: 'dominio-publico' },
  });

  it('libera obra em domínio público', () => {
    const d = licencaDe({ name: 'Agostinho - Confissoes.docx' }, m);
    expect(d.ok).toBe(true);
    expect(d.status).toBe('dominio-publico');
  });

  it('libera obra licenciada', () => {
    expect(licencaDe({ name: 'Obra Licenciada.pdf' }, m).ok).toBe(true);
  });

  it('bloqueia obra marcada como bloqueada', () => {
    const d = licencaDe(
      { name: 'Teologia Sistemática - Franklin Ferreira Alan Myatt.pdf' },
      m,
    );
    expect(d.ok).toBe(false);
    expect(d.status).toBe('bloqueado');
  });

  it('bloqueia obra ausente do manifesto — ausência de sinal é "não"', () => {
    const d = licencaDe({ name: 'Livro Que Ninguem Avaliou.pdf' }, m);
    expect(d.ok).toBe(false);
    expect(d.status).toBe('desconhecido');
  });

  it('bloqueia tudo quando o manifesto não existe', () => {
    const d = licencaDe({ name: 'Agostinho - Confissoes.docx' }, null);
    // Sem manifesto em disco a decisão tem de ser negativa, nunca permissiva.
    expect(d.ok).toBe(false);
  });

  it('casa nomes com acento em NFD, como vêm do Drive', () => {
    // 'á' decomposto (a + U+0301) — o Drive entrega nomes assim.
    const nfd = 'Teologia Sistemática - Franklin Ferreira Alan Myatt.pdf';
    expect(licencaDe({ name: nfd }, m).status).toBe('bloqueado');
  });

  it('resolve por fileId antes do nome', () => {
    expect(
      licencaDe({ id: 'file-id-puro', name: 'nome-irrelevante' }, m).ok,
    ).toBe(true);
  });

  it('só reconhece dois status como aprovados', () => {
    expect([...APROVADOS].sort()).toEqual(['dominio-publico', 'licenciado']);
  });
});
