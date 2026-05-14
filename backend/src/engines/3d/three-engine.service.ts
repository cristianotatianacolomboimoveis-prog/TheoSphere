import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ThreeEngineService {
  private readonly logger = new Logger(ThreeEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getModelById(id: string) {
    this.logger.debug(`Buscando modelo 3D: ${id}`);
    return this.prisma.model3D.findUnique({
      where: { id }
    });
  }

  async getAllModels() {
    return this.prisma.model3D.findMany();
  }

  /**
   * Retorna metadados para renderização procedural se a URL for um ID interno,
   * ou a URL do arquivo GLTF/USDZ se for um asset externo.
   */
  async getModelManifest(modelName: string) {
    return this.prisma.model3D.findFirst({
      where: { 
        OR: [
          { modelName: { contains: modelName, mode: 'insensitive' } },
          { modelUrl: modelName }
        ]
      }
    });
  }
}
