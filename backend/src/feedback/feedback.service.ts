import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export const FEEDBACK_CATEGORIES = [
  'sugestao',
  'bug',
  'duvida',
  'elogio',
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export interface FeedbackInput {
  category?: unknown;
  rating?: unknown;
  message?: unknown;
  email?: unknown;
  pathname?: unknown;
  userAgent?: unknown;
  viewport?: unknown;
}

const MAX_MESSAGE = 4000;

function optionalString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Valida e normaliza o corpo. userId NÃO vem daqui — só do JWT. */
  normalize(input: FeedbackInput) {
    const category = input.category;
    if (
      typeof category !== 'string' ||
      !(FEEDBACK_CATEGORIES as readonly string[]).includes(category)
    ) {
      throw new BadRequestException(
        `Categoria inválida. Use: ${FEEDBACK_CATEGORIES.join(', ')}.`,
      );
    }
    const message =
      typeof input.message === 'string' ? input.message.trim() : '';
    if (message.length < 3) {
      throw new BadRequestException('Escreva ao menos 3 caracteres.');
    }
    if (message.length > MAX_MESSAGE) {
      throw new BadRequestException(
        `Mensagem muito longa (máx. ${MAX_MESSAGE} caracteres).`,
      );
    }
    let rating: number | null = null;
    if (input.rating !== undefined && input.rating !== null) {
      const n = Number(input.rating);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        throw new BadRequestException('A nota deve ser um inteiro de 1 a 5.');
      }
      rating = n;
    }
    const email = optionalString(input.email, 200);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('E-mail de contato inválido.');
    }
    return {
      category: category as FeedbackCategory,
      rating,
      message,
      contactEmail: email,
      pathname: optionalString(input.pathname, 500),
      userAgent: optionalString(input.userAgent, 500),
      viewport: optionalString(input.viewport, 20),
    };
  }

  async create(userId: string | null, input: FeedbackInput) {
    const data = this.normalize(input);
    try {
      const saved = await this.prisma.feedback.create({
        data: { ...data, userId },
        select: { id: true, createdAt: true },
      });
      this.logger.log(
        `Feedback ${saved.id} (${data.category}) recebido${userId ? ` de ${userId}` : ' de visitante'}.`,
      );
      return saved;
    } catch (err: any) {
      // Banco read-only (25006) ou tabela ausente (migração pendente: P2021 /
      // 42P01). Responder 503 — NUNCA fingir sucesso: o relato se perderia.
      const unavailable =
        err?.code === '25006' ||
        err?.code === 'P2021' ||
        err?.code === '42P01' ||
        /read[-_ ]only/i.test(err?.message ?? '');
      if (unavailable) {
        this.logger.error(
          `Feedback NÃO gravado (banco indisponível para escrita): ${err?.code ?? ''} ${err?.message ?? ''}`,
        );
        throw new ServiceUnavailableException(
          'Não foi possível registrar o feedback agora. Tente novamente em alguns minutos.',
        );
      }
      throw err;
    }
  }
}
