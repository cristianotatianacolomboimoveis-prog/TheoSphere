import { ConflictException } from '@nestjs/common';
import { DriveRagService } from './drive-rag.service';
import { DriveRagController } from './drive-rag.controller';

describe('DriveRagService & DriveRagController — Trava de Ingestão Legada', () => {
  let service: DriveRagService;
  let controller: DriveRagController;
  let mockPrisma: any;
  let mockEmbeddingService: any;
  const originalEnv = process.env.ALLOW_LEGACY_LIBRARY_INGEST;

  beforeEach(() => {
    delete process.env.ALLOW_LEGACY_LIBRARY_INGEST;

    mockPrisma = {
      userEmbedding: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    mockEmbeddingService = {
      createEmbedding: jest.fn(),
    };

    service = new DriveRagService(mockPrisma, mockEmbeddingService);
    controller = new DriveRagController(service);
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ALLOW_LEGACY_LIBRARY_INGEST = originalEnv;
    } else {
      delete process.env.ALLOW_LEGACY_LIBRARY_INGEST;
    }
  });

  describe('Bloqueio nas rotas (HTTP 409)', () => {
    it('sem a variável, a rota ingestFolder responde 409 e userEmbedding.create não é chamado', async () => {
      const req: any = { user: { userId: 'user-test-123' } };

      await expect(
        controller.ingestFolder({ folderId: 'folder-123' }, req),
      ).rejects.toThrow(ConflictException);

      await expect(
        controller.ingestFolder({ folderId: 'folder-123' }, req),
      ).rejects.toThrow(
        'ingestão legada desativada; migração para Resource pendente',
      );

      expect(mockPrisma.userEmbedding.create).not.toHaveBeenCalled();
    });

    it('sem a variável, a rota ingestFromUrl responde 409 e userEmbedding.create não é chamado', async () => {
      const req: any = { user: { userId: 'user-test-123' } };

      await expect(
        controller.ingestFromUrl(
          {
            url: 'https://example.com/book.epub',
            fileName: 'book.epub',
            mimeType: 'application/epub+zip',
          },
          req,
        ),
      ).rejects.toThrow(ConflictException);

      await expect(
        controller.ingestFromUrl(
          {
            url: 'https://example.com/book.epub',
            fileName: 'book.epub',
            mimeType: 'application/epub+zip',
          },
          req,
        ),
      ).rejects.toThrow(
        'ingestão legada desativada; migração para Resource pendente',
      );

      expect(mockPrisma.userEmbedding.create).not.toHaveBeenCalled();
    });
  });

  describe('Bloqueio no Cron handleDailySync', () => {
    it('o cron registra o warn e não grava nada', async () => {
      const warnSpy = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => {});
      const ingestFolderSpy = jest.spyOn(service, 'ingestFolder');

      await service.handleDailySync();

      expect(warnSpy).toHaveBeenCalledWith(
        'ingestão legada desativada; migração para Resource pendente',
      );
      expect(ingestFolderSpy).not.toHaveBeenCalled();
      expect(mockPrisma.userEmbedding.create).not.toHaveBeenCalled();
    });
  });
});
