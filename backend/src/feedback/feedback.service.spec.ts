import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';

describe('Feedback dos testadores', () => {
  let prisma: any;
  let service: FeedbackService;

  const valid = {
    category: 'bug',
    rating: 4,
    message: 'O botão de salvar nota não responde.',
    email: 'testador@example.com',
    pathname: '/leitor',
    userAgent: 'Mozilla/5.0',
    viewport: '1440x900',
  };

  beforeEach(() => {
    prisma = {
      feedback: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'fb-1', createdAt: new Date(0) }),
      },
    };
    service = new FeedbackService(prisma);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('grava o relato com o userId do JWT', async () => {
    await service.create('user-123', valid);
    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
        category: 'bug',
        rating: 4,
        message: valid.message,
        contactEmail: 'testador@example.com',
      }),
      select: { id: true, createdAt: true },
    });
  });

  it('ignora userId enviado no corpo (só o JWT identifica)', async () => {
    const controller = new FeedbackController(service);
    await controller.create(
      { user: null } as any,
      {
        ...valid,
        userId: 'atacante',
      } as any,
    );
    const data = prisma.feedback.create.mock.calls[0][0].data;
    expect(data.userId).toBeNull();
    expect(JSON.stringify(data)).not.toContain('atacante');
  });

  it('aceita visitante sem login (userId nulo)', async () => {
    await service.create(null, valid);
    expect(prisma.feedback.create.mock.calls[0][0].data.userId).toBeNull();
  });

  it.each([
    [{ ...valid, category: 'spam' }, 'Categoria'],
    [{ ...valid, message: '  ' }, '3 caracteres'],
    [{ ...valid, message: 'x'.repeat(4001) }, 'muito longa'],
    [{ ...valid, rating: 9 }, 'nota'],
    [{ ...valid, email: 'nao-e-email' }, 'E-mail'],
  ])('rejeita entrada inválida (%#)', async (input, msg) => {
    await expect(service.create(null, input)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.create(null, input)).rejects.toThrow(msg);
    expect(prisma.feedback.create).not.toHaveBeenCalled();
  });

  it.each([
    ['banco read-only', { code: '25006', message: 'read-only transaction' }],
    ['tabela ausente (migração pendente)', { code: 'P2021', message: 'x' }],
  ])('%s → 503, nunca sucesso falso', async (_label, err) => {
    prisma.feedback.create.mockRejectedValue(
      Object.assign(new Error(err.message), { code: err.code }),
    );
    await expect(service.create(null, valid)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('erro desconhecido propaga (não é mascarado como indisponibilidade)', async () => {
    prisma.feedback.create.mockRejectedValue(new Error('ECONNRESET'));
    await expect(service.create(null, valid)).rejects.toThrow('ECONNRESET');
  });
});
