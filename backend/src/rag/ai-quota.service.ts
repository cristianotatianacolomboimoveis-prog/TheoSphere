import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma.service';
import { THEOSPHERE_PLANS } from '../billing/plans.constants';

export interface QuotaStatus {
  usado: number;
  limite: number;
  restante: number;
  excedeu: boolean;
  plano: string;
  diasParaRenovar: number;
  mensagem?: string;
}

/**
 * AiQuotaService — Gestão de cotas mensais de IA por plano de assinatura.
 *
 * Planos e Limites:
 * - FREE (Degustação): 10 créditos
 * - STARTER (R$ 14,90): 60 créditos/mês
 * - PLUS (R$ 24,90): 200 créditos/mês (Recomendado para Pastores)
 * - PRO (R$ 39,90): 600 créditos/mês (Pesquisa Teológica / Acadêmico)
 * - CHURCH (R$ 99,90): 1.500 créditos/mês (Igrejas e Equipes)
 *
 * Regra vital: apenas chamadas efetivas ao provedor de IA consomem cota.
 * Respostas servidas pelo cache semântico ou pelas 108 obras clássicas são
 * gratuitas para o usuário e preservam o saldo de IA.
 */
@Injectable()
export class AiQuotaService implements OnModuleDestroy {
  private readonly logger = new Logger(AiQuotaService.name);
  private readonly redis: Redis | null = null;
  private readonly memoria = new Map<string, { n: number; expiraEm: number }>();
  private readonly cachePlanos = new Map<
    string,
    { plano: string; expiraEm: number }
  >();

  constructor(@Optional() private readonly prisma?: PrismaService) {
    const url = process.env.REDIS_URL;
    if (url) {
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: false,
      });
      this.redis.on('error', (err) =>
        this.logger.warn(`Redis indisponível para cota: ${err.message}`),
      );
    } else {
      this.logger.warn(
        'REDIS_URL ausente — cotas de IA armazenadas em memória resiliente.',
      );
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }

  /** Segundos até o primeiro dia do próximo mês (janela de renovação mensal). */
  private segundosAteViradaDoMes(): number {
    const agora = new Date();
    const proximoMes = new Date(
      agora.getFullYear(),
      agora.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );
    return Math.max(
      60,
      Math.ceil((proximoMes.getTime() - agora.getTime()) / 1000),
    );
  }

  /** Dias restantes até o próximo ciclo de renovação. */
  private diasAteRenovacao(): number {
    const agora = new Date();
    const proximoMes = new Date(
      agora.getFullYear(),
      agora.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );
    const diffMs = proximoMes.getTime() - agora.getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  private chaveMensal(userId: string): string {
    const anoMes = new Date().toISOString().slice(0, 7); // ex: '2026-11'
    return `ai-quota:month:${anoMes}:${userId}`;
  }

  /**
   * Obtém o plano de assinatura do usuário (com cache em memória de 10 min).
   */
  async obterPlanoUsuario(userId: string): Promise<string> {
    if (!userId || userId === 'public-guest' || userId.startsWith('guest:'))
      return 'FREE';

    const cache = this.cachePlanos.get(userId);
    if (cache && cache.expiraEm > Date.now()) {
      return cache.plano;
    }

    if (!this.prisma) return 'FREE';

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });
      const plano = (user?.plan || 'FREE').toUpperCase();
      this.cachePlanos.set(userId, {
        plano,
        expiraEm: Date.now() + 10 * 60 * 1000, // 10 minutos
      });
      return plano;
    } catch (err: any) {
      this.logger.debug(
        `Não foi possível buscar plano de ${userId}: ${err.message}`,
      );
      return 'FREE';
    }
  }

  /**
   * Identidade de cota: o usuário do JWT ou, para visitante, `guest:<ip>`.
   * Antes, visitante ('public-guest') nunca tinha cota e o chat em stream não
   * aplicava cota para ninguém.
   */
  identidadeDeCota(userId: string | undefined, ip: string | undefined): string {
    if (userId && userId !== 'public-guest') return userId;
    return `guest:${ip || 'desconhecido'}`;
  }

  /**
   * Retorna o limite mensal de créditos de IA para o plano especificado.
   */
  obterLimitePlano(plano: string): number {
    const upper = (plano || 'FREE').toUpperCase();
    // Período de teste: AI_CREDITS_FREE_MONTHLY amplia o limite do plano
    // gratuito sem alterar a tabela de planos exibida em /pricing.
    if (upper === 'FREE') {
      const override = Number(process.env.AI_CREDITS_FREE_MONTHLY);
      if (Number.isInteger(override) && override > 0) return override;
    }
    const def = THEOSPHERE_PLANS[upper];
    if (def) return def.aiCreditsMonthly;
    return THEOSPHERE_PLANS.FREE.aiCreditsMonthly;
  }

  /**
   * Consulta o estado atual da cota SEM consumir créditos.
   */
  async consultar(userId: string): Promise<QuotaStatus> {
    if (!userId || userId === 'public-guest') {
      return {
        usado: 0,
        limite: 10,
        restante: 10,
        excedeu: false,
        plano: 'FREE',
        diasParaRenovar: this.diasAteRenovacao(),
      };
    }

    const plano = await this.obterPlanoUsuario(userId);
    const limite = this.obterLimitePlano(plano);
    const chave = this.chaveMensal(userId);
    const diasParaRenovar = this.diasAteRenovacao();

    let usado: number;
    try {
      if (this.redis) {
        usado = Number((await this.redis.get(chave)) ?? 0);
      } else {
        const reg = this.memoria.get(chave);
        usado = reg && reg.expiraEm > Date.now() ? reg.n : 0;
      }
    } catch (err) {
      this.logger.warn(`Falha ao ler cota: ${(err as Error).message}`);
      return {
        usado: 0,
        limite,
        restante: limite,
        excedeu: false,
        plano,
        diasParaRenovar,
      };
    }

    const excedeu = usado >= limite;
    const restante = Math.max(0, limite - usado);

    let mensagem: string | undefined;
    if (excedeu) {
      const nomePlano = THEOSPHERE_PLANS[plano]?.name || plano;
      mensagem =
        `Você atingiu o limite de ${limite} consultas à IA do plano ${nomePlano}. ` +
        `Seu saldo será renovado em ${diasParaRenovar} dias.\n\n` +
        `Enquanto isso, a leitura bíblica, as 108 obras clássicas (Calvino, Matthew Henry, Tomás de Aquino), ` +
        `o Atlas 3D e suas anotações continuam 100% liberados e ilimitados.`;
    }

    return {
      usado,
      limite,
      restante,
      excedeu,
      plano,
      diasParaRenovar,
      mensagem,
    };
  }

  /**
   * Registra UMA chamada efetiva à IA, deduzindo 1 crédito do ciclo mensal.
   */
  async registrarUso(userId: string): Promise<void> {
    if (!userId || userId === 'public-guest') return;

    const chave = this.chaveMensal(userId);
    const ttl = this.segundosAteViradaDoMes();

    try {
      if (this.redis) {
        const n = await this.redis.incr(chave);
        if (n === 1) await this.redis.expire(chave, ttl);
      } else {
        const reg = this.memoria.get(chave);
        const valido = reg !== undefined && reg.expiraEm > Date.now();
        this.memoria.set(chave, {
          n: (valido ? reg.n : 0) + 1,
          expiraEm: valido ? reg.expiraEm : Date.now() + ttl * 1000,
        });
      }
    } catch (err) {
      this.logger.warn(
        `Falha ao registrar uso de cota: ${(err as Error).message}`,
      );
    }
  }
}
