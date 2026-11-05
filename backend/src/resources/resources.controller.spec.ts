import { Test, TestingModule } from '@nestjs/testing';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { BadRequestException } from '@nestjs/common';

describe('ResourcesController (T1.4)', () => {
  let controller: ResourcesController;
  let service: { findReferences: jest.Mock };

  beforeEach(async () => {
    service = {
      findReferences: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourcesController],
      providers: [{ provide: ResourcesService, useValue: service }],
    }).compile();

    controller = module.get<ResourcesController>(ResourcesController);
  });

  it('GET /resources/references?ref=45008028 retorna citações formatadas', async () => {
    service.findReferences.mockResolvedValue([
      {
        id: 'ref-1',
        resourceTitle: 'Commentary on Romans',
        author: 'John Calvin',
        text: 'All things work together for good...',
        canonicalRef: 45008028,
        confidence: 1.0,
      },
    ]);

    const res = await controller.getReferences('45008028', '10');

    expect(service.findReferences).toHaveBeenCalledWith(45008028, 10);
    expect(res).toEqual({
      ref: '45008028',
      count: 1,
      results: [
        {
          id: 'ref-1',
          resourceTitle: 'Commentary on Romans',
          author: 'John Calvin',
          text: 'All things work together for good...',
          canonicalRef: 45008028,
          confidence: 1.0,
        },
      ],
    });
  });

  it('GET /resources/references sem ref lança BadRequestException (400)', async () => {
    await expect(controller.getReferences('')).rejects.toThrow(
      BadRequestException,
    );
  });
});
