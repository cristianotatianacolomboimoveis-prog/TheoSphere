import { Module } from '@nestjs/common';
import { ArchaeologyController } from './archaeology.controller';
import { ArchaeologyService } from './archaeology.service';

/**
 * Módulo do acervo arqueológico — descobertas do mundo bíblico
 * curadas de fontes abertas, com vínculo a referências e coordenadas.
 */
@Module({
  controllers: [ArchaeologyController],
  providers: [ArchaeologyService],
  exports: [ArchaeologyService],
})
export class ArchaeologyModule {}
