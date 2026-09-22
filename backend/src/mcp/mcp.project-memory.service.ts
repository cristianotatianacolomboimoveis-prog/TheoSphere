import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';

export const MCP_MEMORY_CATEGORIES = ['decisions','bugs','discoveries','benchmarks','architecture','incidents','audits','datasets','licenses','tasks','agents'] as const;
export type McpMemoryCategory = (typeof MCP_MEMORY_CATEGORIES)[number];

export interface McpMemoryInput {
  category: McpMemoryCategory;
  memoryKey: string;
  content: string;
  tags?: readonly string[];
  source?: string;
  taskId?: string;
  agentId?: string;
  supersedesId?: string;
}

@Injectable()
export class McpProjectMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  private get memoryDelegate(): any {
    return (this.prisma as any).projectMemory;
  }

  async append(input: McpMemoryInput) {
    const memoryKey = input.memoryKey.trim();
    const content = input.content.trim();
    if (!memoryKey || !content) throw new Error('MCP memory key and content are required');
    return this.memoryDelegate.create({
      data: {
        id: 'MEM-' + randomUUID(),
        category: input.category,
        memoryKey,
        content,
        tags: [...new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))],
        source: input.source?.trim() || undefined,
        taskId: input.taskId?.trim() || undefined,
        agentId: input.agentId?.trim() || undefined,
        supersedesId: input.supersedesId?.trim() || undefined,
      },
    });
  }

  async latest(memoryKey: string) {
    return this.memoryDelegate.findFirst({ where: { memoryKey: memoryKey.trim() }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  }

  /**
   * Returns only the newest snapshot for each memory key under a prefix.
   * Task/agent state is append-only, so loading a fixed number of history rows
   * can silently drop older entities after enough state transitions accumulate.
   */
  async latestByKeyPrefix(category: McpMemoryCategory, prefix: string) {
    const normalizedPrefix = prefix.trim();
    if (!normalizedPrefix) return [];
    return this.prisma.$queryRaw<Array<{
      id: string;
      category: string;
      memoryKey: string;
      content: string;
      tags: string[];
      source: string | null;
      taskId: string | null;
      agentId: string | null;
      supersedesId: string | null;
      createdAt: Date;
    }>>(Prisma.sql`
      SELECT DISTINCT ON ("memoryKey")
        "id", "category", "memoryKey", "content", "tags", "source",
        "taskId", "agentId", "supersedesId", "createdAt"
      FROM "ProjectMemory"
      WHERE "category" = ${category}
        AND "memoryKey" LIKE ${normalizedPrefix + '%'}
      ORDER BY "memoryKey", "createdAt" DESC, "id" DESC
    `);
  }

  /**
   * Atomically read, mutate, and append the latest snapshot for a memory key.
   * PostgreSQL's transaction-scoped advisory lock serializes mutations across
   * independent application instances while keeping the read and append in
   * the same transaction.
   */
  async mutateLatestJson<T>(
    category: McpMemoryCategory,
    memoryKey: string,
    mutate: (current: T) => T,
  ): Promise<T> {
    const normalizedKey = memoryKey.trim();
    if (!normalizedKey) throw new Error('MCP memory key is required');

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${normalizedKey}))`);
      const current = await (tx as any).projectMemory.findFirst({
        where: { category, memoryKey: normalizedKey },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      if (!current) throw new Error(`MCP memory key not found: ${normalizedKey}`);

      let parsed: T;
      try {
        parsed = JSON.parse(current.content) as T;
      } catch {
        throw new Error(`MCP memory content is not valid JSON: ${normalizedKey}`);
      }

      const next = mutate(parsed);
      const content = JSON.stringify(next);
      await (tx as any).projectMemory.create({
        data: {
          id: 'MEM-' + randomUUID(),
          category,
          memoryKey: normalizedKey,
          content,
          tags: current.tags,
          source: current.source ?? undefined,
          taskId: current.taskId ?? undefined,
          agentId: current.agentId ?? undefined,
          supersedesId: current.id,
        },
      });
      return next;
    });
  }

  async list(category?: McpMemoryCategory, limit = 100) {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
    return this.memoryDelegate.findMany({ where: category ? { category } : undefined, orderBy: { createdAt: 'desc' }, take: safeLimit });
  }

  async search(query: string, category?: McpMemoryCategory, limit = 20) {
    const q = query.trim();
    if (!q) return [];
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    return this.memoryDelegate.findMany({
      where: { ...(category ? { category } : {}), OR: [{ memoryKey: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }] },
      orderBy: { createdAt: 'desc' }, take: safeLimit,
    });
  }
}
