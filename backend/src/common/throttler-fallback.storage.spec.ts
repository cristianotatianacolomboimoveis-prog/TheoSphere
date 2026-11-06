import { Logger } from '@nestjs/common';
import { FallbackThrottlerStorage } from './throttler-fallback.storage';

describe('FallbackThrottlerStorage', () => {
  afterEach(() => jest.restoreAllMocks());

  it('usa o Redis quando ele responde', async () => {
    const record = {
      totalHits: 3,
      timeToExpire: 10,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
    const primary = { increment: jest.fn().mockResolvedValue(record) };
    const storage = new FallbackThrottlerStorage(primary);
    await expect(
      storage.increment('k', 60_000, 100, 0, 'default'),
    ).resolves.toBe(record);
  });

  it('Redis fora do ar: conta em memória (sem 500) e avisa uma vez', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const primary = {
      increment: jest
        .fn()
        .mockRejectedValue(new Error('MaxRetriesPerRequestError')),
    };
    const storage = new FallbackThrottlerStorage(primary);

    const first = await storage.increment('ip:1', 60_000, 2, 60_000, 'default');
    const second = await storage.increment(
      'ip:1',
      60_000,
      2,
      60_000,
      'default',
    );
    const third = await storage.increment('ip:1', 60_000, 2, 60_000, 'default');

    expect(first.totalHits).toBe(1);
    expect(second.totalHits).toBe(2);
    // O limite continua valendo na reserva em memória.
    expect(third.totalHits).toBe(3);
    expect(third.isBlocked).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
