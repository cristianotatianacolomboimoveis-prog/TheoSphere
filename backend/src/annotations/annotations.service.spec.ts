import { Test, TestingModule } from '@nestjs/testing';
import { AnnotationsService } from './annotations.service';
import { PrismaService } from '../prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AnnotationsService (T0.4 Server Persistence & Sync)', () => {
  let service: AnnotationsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      annotation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnotationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnnotationsService>(AnnotationsService);
  });

  describe('listAnnotations & Isolamento multi-tenant', () => {
    it('deve listar apenas anotações pertencentes ao userId do JWT', async () => {
      mockPrisma.annotation.findMany.mockResolvedValueOnce([
        { id: 'a1', userId: 'user-A', startRef: 43003016, endRef: 43003016 },
      ]);

      const result = await service.listAnnotations('user-A', {
        startRef: 43003001,
        endRef: 43003999,
      });

      expect(mockPrisma.annotation.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-A',
          deletedAt: null,
          startRef: { gte: 43003001, lte: 43003999 },
        },
        orderBy: { updatedAt: 'asc' },
      });
      expect(result).toHaveLength(1);
    });

    it('impede que usuário B delete anotação de usuário A', async () => {
      mockPrisma.annotation.findUnique.mockResolvedValueOnce({
        id: 'a1',
        userId: 'user-A',
      });

      await expect(service.softDelete('user-B', 'a1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lança NotFoundException se a anotação não existir', async () => {
      mockPrisma.annotation.findUnique.mockResolvedValueOnce(null);

      await expect(service.softDelete('user-A', 'inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('syncBatch com Last-Write-Wins (LWW) e Tombstone', () => {
    it('deve atualizar se a versão local tiver updatedAt mais recente que o servidor', async () => {
      const serverDate = new Date('2026-11-05T10:00:00Z');
      const localDate = new Date('2026-11-05T11:00:00Z');

      mockPrisma.annotation.findFirst.mockResolvedValueOnce({
        id: 'ann-1',
        userId: 'user-1',
        startRef: 1001001,
        endRef: 1001001,
        kind: 'highlight',
        color: 'yellow',
        updatedAt: serverDate,
      });

      mockPrisma.annotation.update.mockResolvedValueOnce({
        id: 'ann-1',
        userId: 'user-1',
        color: 'emerald',
        updatedAt: localDate,
      });

      const res = await service.syncBatch('user-1', [
        {
          id: 'ann-1',
          startRef: 1001001,
          endRef: 1001001,
          kind: 'highlight',
          color: 'emerald',
          updatedAt: localDate.toISOString(),
        },
      ]);

      expect(res.success).toBe(true);
      expect(mockPrisma.annotation.update).toHaveBeenCalled();
    });

    it('mantém o dado do servidor se o servidor tiver versão mais recente que o local', async () => {
      const serverDate = new Date('2026-11-05T12:00:00Z');
      const staleLocalDate = new Date('2026-11-05T10:00:00Z');

      mockPrisma.annotation.findFirst.mockResolvedValueOnce({
        id: 'ann-2',
        userId: 'user-1',
        body: 'Nota mais recente feita no notebook',
        updatedAt: serverDate,
      });

      const res = await service.syncBatch('user-1', [
        {
          id: 'ann-2',
          startRef: 1001001,
          endRef: 1001001,
          kind: 'note',
          body: 'Nota desatualizada do celular offline',
          updatedAt: staleLocalDate.toISOString(),
        },
      ]);

      expect(res.success).toBe(true);
      expect(mockPrisma.annotation.update).not.toHaveBeenCalled();
      expect(res.synced[0].body).toBe('Nota mais recente feita no notebook');
    });

    it('aplica tombstone (deletedAt) quando item vem marcado como excluído', async () => {
      const deleteDate = new Date('2026-11-05T12:30:00Z');

      mockPrisma.annotation.findFirst.mockResolvedValueOnce({
        id: 'ann-3',
        userId: 'user-1',
        updatedAt: new Date('2026-11-05T10:00:00Z'),
      });

      mockPrisma.annotation.update.mockResolvedValueOnce({
        id: 'ann-3',
        deletedAt: deleteDate,
        updatedAt: deleteDate,
      });

      await service.syncBatch('user-1', [
        {
          id: 'ann-3',
          startRef: 1001001,
          endRef: 1001001,
          kind: 'note',
          deletedAt: deleteDate.toISOString(),
          updatedAt: deleteDate.toISOString(),
        },
      ]);

      expect(mockPrisma.annotation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: deleteDate,
          }),
        }),
      );
    });

    it('trata graciosamente estado read-only do banco sem crashar', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce(
        new Error('cannot execute in a read-only transaction (code 25006)'),
      );

      const res = await service.syncBatch('user-1', [
        {
          startRef: 1001001,
          endRef: 1001001,
          kind: 'highlight',
          color: 'blue',
          updatedAt: new Date().toISOString(),
        },
      ]);

      expect(res.success).toBe(false);
      expect(res.readOnlyDegraded).toBe(true);
      expect(res.message).toContain('salvas apenas neste dispositivo');
    });
    it('degrada para local quando a tabela ainda não existe (migração pendente, P2021)', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce(
        Object.assign(
          new Error('The table `public.Annotation` does not exist'),
          {
            code: 'P2021',
          },
        ),
      );
      const res = await service.syncBatch('user-1', [
        {
          startRef: 1001001,
          endRef: 1001001,
          kind: 'highlight',
          color: 'blue',
          updatedAt: new Date().toISOString(),
        },
      ]);
      expect(res.readOnlyDegraded).toBe(true);
    });

    it('propaga erros desconhecidos (não mascara como read-only)', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce(
        Object.assign(new Error('connection reset'), { code: 'ECONNRESET' }),
      );
      await expect(
        service.syncBatch('user-1', [
          {
            startRef: 1001001,
            endRef: 1001001,
            kind: 'note',
            body: 'x',
            updatedAt: new Date().toISOString(),
          },
        ]),
      ).rejects.toThrow('connection reset');
    });
  });
});
