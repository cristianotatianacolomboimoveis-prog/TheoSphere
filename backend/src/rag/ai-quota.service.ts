import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * AiQuotaService — cota diária de chamadas à IA por usuário.
 *
 * Existe porque em 29-30/07/2026 o teto de gastos do projeto Gemini estourou e
 * derrubou a IA para todo mundo. Sem cota individual, um único testador
 * consumindo com afinco esgota o limite do dia da plataforma inteira.
 *
 * Regra central: **só consome cota o que realmente chama a IA.**
 * Resposta vinda do cache semântico ou da biblioteca do Drive é gratuita para
 * a plataforma, então também é gratuita para o usuário. Isso alinha o
 * incentivo — quem repete pergunta ou usa o acervo não é punido.
 *
 * Armazenamento: Redis com expiração na virada do dia (mesma janela do RPD do
 * Google, que zera à meia-noite no Pacífico — usamos meia-noite local, que é
 * mais previsível para o usuário). Sem REDIS_URL, cai para memória: o
 * contador se perde no restart, o que é aceitável para um limite de cortesia.
 */
@Injectable()
export class AiQuotaService implements OnModuleDestroy {
  private readonly logger = new Logger(AiQuotaService.name);
  private readonly redis: Redis | null = null;
  private readonly memoria = new Map<string, { n: number; expiraEm: number }>();

  /** Limite diário por usuário. 0 desliga a checagem. */
  private readonly LIMITE: number;

  constructor() {
    const bruto = Number(process.env.AI_DAILY_LIMIT_PER_USER ?? 30);
    this.LIMITE = Number.isFinite(bruto) && bruto >= 0 ? bruto : 30;

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
        'REDIS_URL ausente — cota de IA contada em memória (zera a cada restart).',
      );
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }

  /** Segundos até a próxima meia-noite local. */
  private segundosAteVirada(): number {
    const agora = new Date();
    const meiaNoite = new Date(agora);
    meiaNoite.setHours(24, 0, 0, 0);
    return Math.max(
      60,
      Math.ceil((meiaNoite.getTime() - agora.getTime()) / 1000),
    );
  }

  private chave(userId: string): string {
    const hoje = new Date().toISOString().slice(0, 10);
    return `ai-quota:${hoje}:${userId}`;
  }

  /**
   * Consulta o estado da cota SEM consumir. Usado antes de decidir se vale a
   * pena chamar a IA.
   */
  async consultar(userId: string): Promise<{
    usado: number;
    limite: number;
    restante: number;
    excedeu: boolean;
  }> {
    if (this.LIMITE === 0) {
      return { usado: 0, limite: 0, restante: Infinity, excedeu: false };
    }

    let usado: number;
    try {
      if (this.redis) {
        usado = Number((await this.redis.get(this.chave(userId))) ?? 0);
      } else {
        const reg = this.memoria.get(this.chave(userId));
        usado = reg && reg.expiraEm > Date.now() ? reg.n : 0;
      }
    } catch (err) {
      // Falha de infraestrutura não pode bloquear o usuário.
      this.logger.warn(`Falha ao ler cota: ${(err as Error).message}`);
      return {
        usado: 0,
        limite: this.LIMITE,
        restante: this.LIMITE,
        excedeu: false,
      };
    }

    return {
      usado,
      limite: this.LIMITE,
      restante: Math.max(0, this.LIMITE - usado),
      excedeu: usado >= this.LIMITE,
    };
  }

  /**
   * Registra UMA chamada efetiva à IA. Deve ser invocado apenas quando o
   * provedor foi mesmo acionado — nunca em cache hit nem em resposta servida
   * pela biblioteca.
   */
  async registrarUso(userId: string): Promise<void> {
    if (this.LIMITE === 0) return;

    const chave = this.chave(userId);
    const ttl = this.segundosAteVirada();

    try {
      if (this.redis) {
        const n = await this.redis.incr(chave);
        // Só define expiração na primeira ocorrência do dia.
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
