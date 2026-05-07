import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { GeospatialService } from './geospatial/geospatial.service';
import { RagService } from './rag/rag.service';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geospatial: GeospatialService,
    private readonly ragService: RagService,
  ) {}

  /**
   * Busca todos os locais (Delegado para GeospatialService)
   */
  async getAllLocations() {
    return this.geospatial.getAllLocations();
  }

  /**
   * Análise Multi-Tradição (Integrado com o sistema de RAG)
   */
  async compareTheology(topic: string, userId: string) {
    this.logger.log(`Iniciando comparação teológica para o tópico: ${topic}`);

    // Utilizamos o RagService para aproveitar o cache semântico e contexto do usuário
    const response = await this.ragService.chat(
      `Analise o tema "${topic}" sob múltiplas perspectivas teológicas (Reformada, Batista, Arminiana) e forneça um consenso geral com Grau de Tensão.`,
      userId,
      undefined, // tradição genérica
      [], // histórico vazio
    );

    // O RagService já lida com XP do usuário internamente se o userId for válido
    // Mas garantimos aqui se necessário ou para propósitos específicos de gamificação
    await this.addUserXP(userId, 5); // XP extra por usar a ferramenta de comparação

    return response.content;
  }

  /**
   * Método auxiliar para adicionar XP (Gamificação)
   */
  private async addUserXP(
    userId: string | undefined,
    xp: number,
  ): Promise<void> {
    if (!userId || userId === 'user-anonimo') return;
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: xp } },
      });
    } catch (e) {
      this.logger.debug(`Falha ao adicionar XP: ${e.message}`);
    }
  }
}
