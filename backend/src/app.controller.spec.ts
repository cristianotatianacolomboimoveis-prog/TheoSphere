import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { OrchestratorService } from './orchestrator.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: OrchestratorService,
          useValue: {
            getAllLocations: jest.fn().mockResolvedValue([]),
            compareTheology: jest.fn().mockResolvedValue('Analysis'),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    appController = app.get<AppController>(AppController);
  });

  describe('locations', () => {
    it('returns a paginated slice with default page=1 limit=100', async () => {
      const result = await appController.getLocations(1, 100);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta).toMatchObject({
        page: 1,
        limit: 100,
        total: 0,
        hasMore: false,
      });
    });

    it('caps limit at 200', async () => {
      const result = await appController.getLocations(1, 999);
      expect(result.meta.limit).toBe(200);
    });
  });
});
