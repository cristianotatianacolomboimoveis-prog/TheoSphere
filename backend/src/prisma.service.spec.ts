import { buildPoolConfig, PrismaService } from './prisma.service';

describe('PrismaService Pool TLS Configuration', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('com NODE_ENV=production, a configuração do Pool tem ssl', () => {
    const config = buildPoolConfig(
      'postgres://localhost:5432/test',
      'production',
    );
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
    expect(config.max).toBe(20);
  });

  it('com NODE_ENV!=production, a configuração do Pool não tem ssl', () => {
    const config = buildPoolConfig(
      'postgres://localhost:5432/test',
      'development',
    );
    expect(config.ssl).toBeUndefined();
    expect(config.max).toBe(10);
  });

  it('instância de PrismaService em produção instancia Pool com ssl', () => {
    process.env.NODE_ENV = 'production';
    const service = new PrismaService();
    const pool = (service as any).pool;
    expect(pool.options.ssl).toEqual({ rejectUnauthorized: false });
  });
});
