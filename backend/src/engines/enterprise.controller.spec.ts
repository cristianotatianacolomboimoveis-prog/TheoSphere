import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Request } from 'express';
import { EnterpriseController } from './enterprise.controller';
import { SearchQueryDto } from './dto/search-query.dto';

/**
 * Regressão de autorização (AGENTS.md §3): `userId` vem do JWT, nunca do
 * cliente. Antes, `ai/explain`, `ai/exegesis` e `search` aceitavam `userId`
 * do body/query — qualquer usuário logado lia o contexto privado
 * (UserEmbedding) de outro, e omitir o campo pulava a cota diária de IA.
 */
describe('EnterpriseController — userId vem só do JWT', () => {
  const ai = {
    explainContext: jest.fn().mockResolvedValue('ok'),
    performExegesis: jest.fn().mockResolvedValue('ok'),
  };
  const controller = new EnterpriseController(
    {} as never,
    {} as never,
    {} as never,
    ai as never,
    {} as never,
  );
  const asUser = (userId?: string) =>
    ({ user: userId ? { userId, email: 'x@y.z' } : undefined }) as Request;

  beforeEach(() => jest.clearAllMocks());

  it('ai/exegesis ignora userId forjado no body e usa o do token', async () => {
    const forged = { book: 'João', chapter: 3, userId: 'vitima' };
    await controller.performExegesis(forged, asUser('atacante'));
    expect(ai.performExegesis).toHaveBeenCalledWith('João', 3, 'atacante');
  });

  it('ai/explain usa o userId do token', async () => {
    await controller.explain('graça', asUser('atacante'));
    expect(ai.explainContext).toHaveBeenCalledWith('graça', 'atacante');
  });

  it('search usa o userId do token', async () => {
    await controller.search({ q: 'graça' }, asUser('atacante'));
    expect(ai.explainContext).toHaveBeenCalledWith('graça', 'atacante');
  });

  it('SearchQueryDto rejeita userId vindo da query (forbidNonWhitelisted)', async () => {
    const dto = plainToInstance(SearchQueryDto, {
      q: 'graça',
      userId: '6f1c2a4e-1b2c-4d5e-8f90-123456789abc',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((e) => e.property)).toContain('userId');
  });
});
