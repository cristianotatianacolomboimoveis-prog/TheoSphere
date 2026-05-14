import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// ─── Singleton Pattern ──────────────────────────────────────────────────────
// Em desenvolvimento, o NestJS realiza hot-reloads frequentes. Se criarmos uma
// nova instância do PrismaClient a cada reload, esgotaremos o pool de 
// conexões do PostgreSQL rapidamente. O objeto global persiste entre reloads.
// ─────────────────────────────────────────────────────────────────────────────

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Inicializamos a classe base usando a instância singleton se disponível
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
