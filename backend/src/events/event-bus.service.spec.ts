import { EventBusService, EVENT_CHANNELS } from './event-bus.service';

/**
 * Testes do modo "disabled" do EventBus (sem REDIS_URL).
 *
 * O caminho conectado (com Redis real) é coberto indiretamente pelo health
 * check em produção; aqui garantimos que a ausência de REDIS_URL é tratada
 * como desabilitado deliberado — sem tentativas de conexão a localhost e
 * sem exceções nos no-ops.
 */
describe('EventBusService — disabled mode (REDIS_URL ausente)', () => {
  let service: EventBusService;
  let savedRedisUrl: string | undefined;

  beforeEach(() => {
    savedRedisUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    service = new EventBusService();
    service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    if (savedRedisUrl !== undefined) process.env.REDIS_URL = savedRedisUrl;
  });

  it('isEnabled() retorna false', () => {
    expect(service.isEnabled()).toBe(false);
  });

  it('isHealthy() retorna false (nenhuma conexão criada)', () => {
    expect(service.isHealthy()).toBe(false);
  });

  it('publish() é um no-op que não lança', async () => {
    await expect(
      service.publish(EVENT_CHANNELS.LOG, { hello: 'world' }),
    ).resolves.toBeUndefined();
  });

  it('subscribe() retorna função de unsubscribe sem lançar', async () => {
    const unsubscribe = await service.subscribe(
      EVENT_CHANNELS.RAG_HIT,
      () => {},
    );
    await expect(unsubscribe()).resolves.toBeUndefined();
  });

  it('publishLog()/publishIngestion() não lançam', () => {
    expect(() =>
      service.publishLog('log', 'spec', 'mensagem de teste'),
    ).not.toThrow();
    expect(() =>
      service.publishIngestion(EVENT_CHANNELS.INGESTION_BIBLE, {
        kind: 'chapter.done',
      }),
    ).not.toThrow();
  });
});
