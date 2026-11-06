import { Logger } from '@nestjs/common';
import { RagController } from './rag.controller';
import { AiQuotaService } from './ai-quota.service';

/**
 * Achado de 2026-11-06: o chat principal do app usa POST /rag/chat/stream, que
 * não aplicava cota a ninguém; e visitante ('public-guest') nunca tinha cota
 * em nenhum dos dois endpoints — custo de IA sem teto.
 */
describe('RagController — cota de IA', () => {
  let quota: AiQuotaService;
  let rag: any;
  let controller: RagController;

  const fakeRes = () => {
    const writes: string[] = [];
    return {
      writes,
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn((s: string) => writes.push(s)),
      end: jest.fn(),
    } as any;
  };

  beforeEach(() => {
    delete process.env.REDIS_URL;
    delete process.env.AI_CREDITS_FREE_MONTHLY;
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    quota = new AiQuotaService(undefined);
    rag = {
      chat: jest.fn().mockResolvedValue({ content: 'resposta', cached: false }),
      chatStream: jest.fn(async function* () {
        yield { type: 'chunk', data: { text: 'olá' } };
        yield { type: 'done', data: { cached: false, tokens: 3 } };
      }),
    };
    controller = new RagController(
      rag,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      quota,
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await (quota as any).onModuleDestroy?.();
  });

  const body = { query: 'O que é graça?' } as any;

  it('visitante no /chat: cada resposta consome cota do IP; ao esgotar, a IA não é chamada', async () => {
    const req = { ip: '203.0.113.7' } as any;
    for (let i = 0; i < 10; i++) await controller.chat(body, req);
    expect(rag.chat).toHaveBeenCalledTimes(10);

    const blocked = await controller.chat(body, req);
    expect(rag.chat).toHaveBeenCalledTimes(10);
    expect(blocked.data.meta.degraded).toBe(true);
    expect(blocked.data.content).toMatch(/Crie uma conta/);

    // Outro IP tem a própria cota.
    await controller.chat(body, { ip: '198.51.100.9' } as any);
    expect(rag.chat).toHaveBeenCalledTimes(11);
  });

  it('/chat/stream aplica cota também para usuário logado', async () => {
    const req = { user: { userId: 'u-1' }, ip: '203.0.113.7' } as any;
    for (let i = 0; i < 10; i++)
      await controller.chatStream(body, req, fakeRes());
    expect(rag.chatStream).toHaveBeenCalledTimes(10);

    const res = fakeRes();
    await controller.chatStream(body, req, res);
    expect(rag.chatStream).toHaveBeenCalledTimes(10);
    expect(res.writes.join('')).toMatch(/limite de 10 consultas/);
    expect(res.end).toHaveBeenCalled();
  });

  it('resposta em cache não consome cota no stream', async () => {
    rag.chatStream = jest.fn(async function* () {
      yield { type: 'chunk', data: { text: 'do cache' } };
      yield { type: 'done', data: { cached: true } };
    });
    const req = { user: { userId: 'u-2' } } as any;
    for (let i = 0; i < 15; i++)
      await controller.chatStream(body, req, fakeRes());
    expect(rag.chatStream).toHaveBeenCalledTimes(15);
  });

  it('AI_CREDITS_FREE_MONTHLY amplia o limite do plano gratuito', () => {
    expect(quota.obterLimitePlano('FREE')).toBe(10);
    process.env.AI_CREDITS_FREE_MONTHLY = '200';
    expect(quota.obterLimitePlano('FREE')).toBe(200);
    process.env.AI_CREDITS_FREE_MONTHLY = 'abc';
    expect(quota.obterLimitePlano('FREE')).toBe(10);
  });
});
