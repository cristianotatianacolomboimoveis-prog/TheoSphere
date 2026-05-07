import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrchestratorService } from './orchestrator.service';
import { SimpleAuthGuard } from './auth/simple-auth.guard';
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
      .overrideGuard(SimpleAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    appController = app.get<AppController>(AppController);
  });

  describe('locations', () => {
    it('should return locations data', async () => {
      const result = await appController.getLocations();
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});
