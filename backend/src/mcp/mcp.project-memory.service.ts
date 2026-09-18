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

  async append(input: McpMemoryInput) {
    const memoryKey = input.memoryKey.trim();
    const content = input.content.trim();
    if (!memoryKey || !content) throw new Error('MCP memory key and content are required');
    return this.prisma.projectMemory.create({
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
    return this.prisma.projectMemory.findFirst({ where: { memoryKey: memoryKey.trim() }, orderBy: { createdAt: 'desc' } });
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

  async list(category?: McpMemoryCategory, limit = 100) {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
    return this.prisma.projectMemory.findMany({ where: category ? { category } : undefined, orderBy: { createdAt: 'desc' }, take: safeLimit });
  }

  async search(query: string, category?: McpMemoryCategory, limit = 20) {
    const q = query.trim();
    if (!q) return [];
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    return this.prisma.projectMemory.findMany({
      where: { ...(category ? { category } : {}), OR: [{ memoryKey: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }] },
      orderBy: { createdAt: 'desc' }, take: safeLimit,
    });
  }
}
