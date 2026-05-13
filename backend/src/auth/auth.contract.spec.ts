import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma.service';

/**
 * Auth contract tests.
 *
 * These tests pin the on-the-wire shape of /api/v1/auth/* so the frontend
 * (useAuth, lib/api) can't drift again. SEC-007 happened because the
 * frontend expected `{ success, data }` but the controller returned a
 * bare `{ accessToken, user }` — every login was silently treated as
 * a failure for weeks.
 *
 * Requires:
 *   • A running Postgres reachable via DATABASE_URL (uses real Prisma).
 *   • A 32+ char JWT_SECRET in the env.
 *
 * Run with: `npm run test:e2e` (file is *.e2e-spec.ts).
 */
describe('Auth contract (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Use a fresh email per run to avoid colliding with prior test data.
  const testUser = {
    email: `contract-${Date.now()}@theosphere.test`,
    password: 'Password123!Strong',
  };

  // Supertest's response.get('Set-Cookie') is typed `string[] | undefined`.
  // This helper asserts the header exists and returns a non-empty array,
  // so the rest of the test body can index without optional chaining.
  const cookiesOf = (res: request.Response): string[] => {
    const cookies = res.get('Set-Cookie') as string[] | undefined;
    expect(cookies).toBeDefined();
    expect(Array.isArray(cookies) && cookies.length).toBeGreaterThan(0);
    return cookies as string[];
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Best-effort cleanup so consecutive runs stay isolated.
    try {
      await prisma.user.deleteMany({ where: { email: testUser.email } });
    } catch {
      /* ignore */
    }
    await app.close();
  });

  it('POST /api/v1/auth/register → 201 with userId', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);

    expect(response.body).toHaveProperty('userId');
    expect(response.body.userId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('POST /api/v1/auth/login → 200 with accessToken + httpOnly refresh cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(testUser)
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', testUser.email);
    expect(response.body.user).toHaveProperty('id');
    // The refresh token must NEVER come back in the body — only via cookie.
    expect(response.body).not.toHaveProperty('refreshToken');

    const cookies = cookiesOf(response);
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/HttpOnly/i);
    expect(refreshCookie).toMatch(/Path=\/api\/v1\/auth\/refresh/);
  });

  it('POST /api/v1/auth/login → 401 on wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword999' })
      .expect(401);
  });

  it('POST /api/v1/auth/refresh → 200 and rotates the cookie', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(testUser);

    const loginCookies = cookiesOf(loginRes);
    const initialRefresh = loginCookies.find((c) =>
      c.startsWith('refreshToken='),
    );
    expect(initialRefresh).toBeDefined();

    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', loginCookies)
      .expect(200);

    expect(refreshRes.body).toHaveProperty('accessToken');

    const refreshedCookies = cookiesOf(refreshRes);
    const newRefresh = refreshedCookies.find((c) =>
      c.startsWith('refreshToken='),
    );
    expect(newRefresh).toBeDefined();
    // Rotation requirement: the new opaque token MUST differ from the old.
    expect(newRefresh).not.toEqual(initialRefresh);
  });

  it('POST /api/v1/auth/refresh → 401 without cookie', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .expect(401);
  });

  it('POST /api/v1/auth/logout → 200 and clears the cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .expect(200);

    const cookies = cookiesOf(response);
    // Cookie-clear is signalled by setting refreshToken to empty/expired.
    const cleared = cookies.find(
      (c) => c.startsWith('refreshToken=;') || c.startsWith('refreshToken=""'),
    );
    expect(cleared).toBeDefined();
  });
});
