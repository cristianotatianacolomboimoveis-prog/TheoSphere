import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import * as passwordUtil from './password.util';

/**
 * Testes unitários do AuthService — o módulo mais sensível do sistema.
 * password.util é mockado (bcrypt cost 12 real deixaria a suíte lenta);
 * o util tem contrato próprio e pode ganhar suíte dedicada.
 *
 * Cobertura: registro (conflito), login (credenciais, upgrade transparente
 * de hash legado), refresh (rotação, expiração e DETECÇÃO DE REUSO com
 * revogação global — a propriedade de segurança mais importante do fluxo).
 */
jest.mock('./password.util', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  needsRehash: jest.fn(),
}));

const mockedPw = passwordUtil as jest.Mocked<typeof passwordUtil>;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let jwt: { sign: jest.Mock };

  const user = {
    id: 'u1',
    email: 'a@b.com',
    passwordHash: 'sha256$abc',
    plan: 'FREE',
    xp: 0,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('rejeita e-mail já cadastrado com ConflictException', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      await expect(service.register('a@b.com', 'senha123')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('cria usuário FREE com hash e não vaza a senha', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      mockedPw.hashPassword.mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue({ ...user, id: 'u2' });

      const res = await service.register('novo@b.com', 'senha123');

      expect(mockedPw.hashPassword).toHaveBeenCalledWith('senha123');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ plan: 'FREE', passwordHash: 'hashed' }),
      });
      expect(res).toEqual({ message: expect.any(String), userId: 'u2' });
      expect(JSON.stringify(res)).not.toContain('senha123');
    });

    it('normaliza o e-mail (trim + minúsculas) antes de gravar', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      mockedPw.hashPassword.mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue({ ...user, id: 'u3' });

      await service.register('  Novo@B.COM ', 'senha123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'novo@b.com' },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: 'novo@b.com' }),
      });
    });
  });

  describe('login', () => {
    it('mesma exceção para usuário inexistente e senha errada (anti-enumeração)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const errA = await service.login('x@b.com', 'p').catch((e: Error) => e);

      prisma.user.findUnique.mockResolvedValue(user);
      mockedPw.verifyPassword.mockResolvedValue(false);
      const errB = await service.login('a@b.com', 'p').catch((e: Error) => e);

      expect(errA).toBeInstanceOf(UnauthorizedException);
      expect(errB).toBeInstanceOf(UnauthorizedException);
      expect((errA as Error).message).toBe((errB as Error).message);
    });

    it('e-mail com maiúsculas/espaços loga na conta canônica (não dá 401)', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      mockedPw.verifyPassword.mockResolvedValue(true);
      mockedPw.needsRehash.mockReturnValue(false);

      await service.login('  A@B.com ', 'senha');

      // sem normalização, a busca iria com "  A@B.com " e não acharia o usuário
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
      });
    });

    it('login válido emite JWT + refresh token persistido', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      mockedPw.verifyPassword.mockResolvedValue(true);
      mockedPw.needsRehash.mockReturnValue(false);

      const res = await service.login('a@b.com', 'senha');

      expect(jwt.sign).toHaveBeenCalledWith({ sub: 'u1', email: 'a@b.com' });
      expect(res.accessToken).toBe('signed.jwt');
      expect(typeof res.refreshToken).toBe('string');
      expect(res.refreshToken.length).toBeGreaterThanOrEqual(80); // 40 bytes hex
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'u1' }),
      });
      expect(res.user).toEqual({
        id: 'u1',
        email: 'a@b.com',
        plan: 'FREE',
        xp: 0,
      });
    });

    it('hash legado é atualizado de forma transparente no login', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      mockedPw.verifyPassword.mockResolvedValue(true);
      mockedPw.needsRehash.mockReturnValue(true);
      mockedPw.hashPassword.mockResolvedValue('upgraded');

      await service.login('a@b.com', 'senha');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { passwordHash: 'upgraded' },
      });
    });

    it('falha no upgrade de hash NÃO quebra o login', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      mockedPw.verifyPassword.mockResolvedValue(true);
      mockedPw.needsRehash.mockReturnValue(true);
      mockedPw.hashPassword.mockRejectedValue(new Error('boom'));

      const res = await service.login('a@b.com', 'senha');
      expect(res.accessToken).toBe('signed.jwt');
    });
  });

  describe('refresh', () => {
    const validToken = {
      id: 'rt1',
      token: 'tok',
      userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86_400_000),
      user,
    };

    it('token inexistente → UnauthorizedException', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('nope')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('token expirado → UnauthorizedException sem revogação global', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...validToken,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refresh('tok')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('SEGURANÇA: reuso de token revogado revoga TODAS as sessões do usuário', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...validToken,
        revokedAt: new Date(),
      });

      await expect(service.refresh('tok')).rejects.toThrow(/revogadas/i);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('refresh válido ROTACIONA: revoga o antigo, cria novo, aponta replacedBy', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(validToken);

      const res = await service.refresh('tok');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: expect.objectContaining({
          revokedAt: expect.any(Date),
          replacedBy: res.refreshToken,
        }),
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: res.refreshToken,
          userId: 'u1',
        }),
      });
      expect(res.refreshToken).not.toBe('tok');
      expect(res.accessToken).toBe('signed.jwt');
    });
  });
});
