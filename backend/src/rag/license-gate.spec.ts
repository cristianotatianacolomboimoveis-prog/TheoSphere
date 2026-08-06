import { licencaDe, normaliza, APROVADOS, OBRAS } from './license-gate';
import type { ObraLicenca } from './license-manifest';

/**
 * O portão de licença é fail-closed: o que não está explicitamente aprovado
 * não entra. Estes testes existem porque a primeira versão vivia só nos
 * scripts de curadoria — a API de ingestão passava por fora dela e deixou
 * entrar uma obra protegida com milhares de trechos em 04/08/2026. A segunda
 * versão lia o manifesto do disco e, não o achando em produção, barrou até as
 * obras aprovadas. Daí o manifesto ser código compilado.
 */
const FIXTURE: Record<string, ObraLicenca> = {
  'Agostinho - Confissoes.docx': {
    status: 'dominio-publico',
    motivo: 'Século IV; tradução livre',
  },
  'Teologia Sistemática - Franklin Ferreira Alan Myatt.pdf': {
    status: 'bloqueado',
    motivo: 'Direito autoral vigente',
  },
  'Obra Licenciada.pdf': { status: 'licenciado', motivo: 'Contrato assinado' },
  'file-id-puro': { status: 'dominio-publico', motivo: 'Resolvido por id' },
};

describe('license-gate', () => {
  it('libera obra em domínio público', () => {
    const d = licencaDe({ name: 'Agostinho - Confissoes.docx' }, FIXTURE);
    expect(d.ok).toBe(true);
    expect(d.status).toBe('dominio-publico');
  });

  it('libera obra licenciada', () => {
    expect(licencaDe({ name: 'Obra Licenciada.pdf' }, FIXTURE).ok).toBe(true);
  });

  it('bloqueia obra marcada como bloqueada', () => {
    const d = licencaDe(
      { name: 'Teologia Sistemática - Franklin Ferreira Alan Myatt.pdf' },
      FIXTURE,
    );
    expect(d.ok).toBe(false);
    expect(d.status).toBe('bloqueado');
  });

  it('bloqueia obra ausente do manifesto — ausência de sinal é "não"', () => {
    const d = licencaDe({ name: 'Livro Que Ninguem Avaliou.pdf' }, FIXTURE);
    expect(d.ok).toBe(false);
    expect(d.status).toBe('desconhecido');
  });

  it('bloqueia quando o manifesto está vazio', () => {
    expect(licencaDe({ name: 'Agostinho - Confissoes.docx' }, {}).ok).toBe(
      false,
    );
  });

  it('casa nomes com acento em NFD, como vêm do Drive', () => {
    const titulo = 'Teologia Sistemática - Franklin Ferreira Alan Myatt.pdf';
    const nfd = titulo.normalize('NFD');
    expect(licencaDe({ name: nfd }, FIXTURE).status).toBe('bloqueado');
  });

  it('resolve por fileId antes do nome', () => {
    expect(
      licencaDe({ id: 'file-id-puro', name: 'nome-irrelevante' }, FIXTURE).ok,
    ).toBe(true);
  });

  it('só reconhece dois status como aprovados', () => {
    expect([...APROVADOS].sort()).toEqual(['dominio-publico', 'licenciado']);
  });

  describe('manifesto real embarcado', () => {
    it('está disponível sem ler disco — não pode faltar em produção', () => {
      expect(Object.keys(OBRAS).length).toBeGreaterThan(0);
    });

    it('mantém a Teologia Sistemática bloqueada', () => {
      const d = licencaDe({
        name: 'Teologia Sistemática - Franklin Ferreira Alan Myatt.pdf',
      });
      expect(d.ok).toBe(false);
      expect(d.status).toBe('bloqueado');
    });

    it('mantém as Confissões de Agostinho liberadas', () => {
      const d = licencaDe({
        name: 'Confissoes de Agostinho - Livro I parte 2 - dominio publico.docx',
      });
      expect(d.ok).toBe(true);
      expect(d.status).toBe('dominio-publico');
    });

    it('toda obra do manifesto tem status válido e motivo escrito', () => {
      for (const [nome, obra] of Object.entries(OBRAS)) {
        expect(['dominio-publico', 'licenciado', 'bloqueado']).toContain(
          obra.status,
        );
        // Sem motivo não há rastro de por que a obra pode (ou não) ser servida.
        expect(obra.motivo?.length ?? 0).toBeGreaterThan(10);
        expect(normaliza(nome)).not.toHaveLength(0);
      }
    });
  });
});
