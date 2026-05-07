import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RagService, ChatMessage } from './rag.service';
import { UserDocument } from './user-context.service';
import { SemanticCacheService } from './semantic-cache.service';
import { BibleIngestionService } from '../bible-ingestion.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditService, AUDIT_ACTIONS } from '../audit/audit.service';
import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

/* ─── DTOs ──────────────────────────────────────────────── */

class ChatDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  // SECURITY: `userId` is no longer accepted from the body. The handler
  // sources it from `req.user.userId` (JWT). Leaving it here would let an
  // authenticated user impersonate another in cache + XP accounting.

  @IsString()
  @IsOptional()
  tradition?: string;

  @IsArray()
  @IsOptional()
  history?: ChatMessage[];

  @IsOptional()
  jsonMode?: boolean;
}

class IndexDocumentsDto {
  // userId removed — sourced from JWT.
  @IsArray()
  documents: UserDocument[];
}

// IngestRichVerseDto removed — the underlying handler `ingestRichPassage`
// referenced fields that don't exist in the BibleVerse model (author,
// verseType, characters, themes, verseRange, metadata) and would have
// thrown at runtime. Re-introduce only after the schema is extended.

class SyncContextDto {
  // userId removed — sourced from JWT.

  @IsArray()
  @IsOptional()
  notes: any[];

  @IsArray()
  @IsOptional()
  sermons: any[];

  @IsArray()
  @IsOptional()
  highlights: any[];

  @IsArray()
  @IsOptional()
  studies: any[];

  @IsArray()
  @IsOptional()
  bookmarks: any[];
}

/* ─── Controller ────────────────────────────────────────── */

@Controller('api/v1/rag')
@UseGuards(JwtAuthGuard)
export class RagController {
  private readonly logger = new Logger(RagController.name);

  constructor(
    private readonly ragService: RagService,
    private readonly semanticCache: SemanticCacheService,
    private readonly bibleIngestion: BibleIngestionService,
    private readonly audit: AuditService,
  ) {}

  @Post('chat')
  async chat(@Body() body: ChatDto, @Req() req: Request) {
    // SECURITY: identity comes from the JWT, never from the body.
    const userId = (req as any).user?.userId as string | undefined;
    this.logger.log(
      `[Chat] User: ${userId ?? 'anon'} | Query: "${body.query?.slice(0, 60)}..."`,
    );

    const response = await this.ragService.chat(
      body.query,
      userId,
      body.tradition,
      body.history || [],
      body.jsonMode,
    );

    return {
      success: true,
      data: {
        content: response.content,
        meta: {
          cached: response.cached,
          similarity: response.similarity,
          cacheSource: response.cacheSource,
          contextUsed: response.contextUsed,
          contextDocCount: response.contextDocCount,
          tokensEstimated: response.tokensEstimated,
          costEstimated: response.costEstimated,
        },
      },
    };
  }

  @Post('index')
  async indexDocuments(@Body() body: IndexDocumentsDto, @Req() req: Request) {
    const userId = (req as any).user?.userId as string;
    this.logger.log(
      `[Index] User: ${userId} | Docs: ${body.documents?.length || 0}`,
    );

    const result = await this.ragService.indexUserContent(
      userId,
      body.documents,
    );

    return {
      success: true,
      data: result,
    };
  }

  // POST /ingest-rich-verse removed — see comment on IngestRichVerseDto above.
  @Post('sync')
  async syncUserContent(@Body() body: SyncContextDto, @Req() req: Request) {
    const userId = (req as any).user?.userId as string;
    this.logger.log(
      `[Sync] User: ${userId} | ` +
        `Notes: ${body.notes?.length || 0}, Sermons: ${body.sermons?.length || 0}, ` +
        `Highlights: ${body.highlights?.length || 0}, Studies: ${body.studies?.length || 0}`,
    );

    const documents: UserDocument[] = [];

    // Converte notas
    for (const note of body.notes || []) {
      documents.push({
        id: `note-${note.id}`,
        userId: userId,
        type: 'note',
        content: note.content,
        metadata: {
          reference: note.reference,
          tags: note.tags,
          notebookId: note.notebookId,
        },
        createdAt: note.timestamp || Date.now(),
      });
    }

    // Converte sermões
    for (const sermon of body.sermons || []) {
      const pointsText = (sermon.points || [])
        .map((p: any, i: number) => `${i + 1}. ${p.title}: ${p.content}`)
        .join('\n');

      documents.push({
        id: `sermon-${sermon.id}`,
        userId: userId,
        type: 'sermon',
        content: `${sermon.title}\n${sermon.passage}\n${pointsText}\n${sermon.notes || ''}`,
        metadata: {
          title: sermon.title,
          passage: sermon.passage,
          points: sermon.points,
          date: sermon.date,
        },
        createdAt: sermon.createdAt || Date.now(),
      });
    }

    // Converte highlights
    for (const hl of body.highlights || []) {
      documents.push({
        id: `highlight-${hl.id}`,
        userId: userId,
        type: 'highlight',
        content: hl.text,
        metadata: {
          reference: hl.reference,
          verseNumber: hl.verseNumber,
          color: hl.color,
        },
        createdAt: hl.timestamp || Date.now(),
      });
    }

    // Converte estudos
    for (const study of body.studies || []) {
      documents.push({
        id: `study-${study.id}`,
        userId: userId,
        type: 'study',
        content: `${study.title}\n${study.passage}\n${study.questions?.join('\n') || ''}\n${study.leaderNotes || ''}`,
        metadata: {
          title: study.title,
          passage: study.passage,
          questions: study.questions,
          additionalRefs: study.additionalRefs,
        },
        createdAt: study.createdAt || Date.now(),
      });
    }

    // Converte bookmarks
    for (const bm of body.bookmarks || []) {
      documents.push({
        id: `bookmark-${bm.id}`,
        userId: userId,
        type: 'bookmark',
        content: `Favorito: ${bm.reference} ${bm.label || ''}`,
        metadata: {
          reference: bm.reference,
          label: bm.label,
        },
        createdAt: bm.timestamp || Date.now(),
      });
    }

    if (documents.length === 0) {
      return { success: true, data: { indexed: 0, skipped: 0, total: 0 } };
    }

    const result = await this.ragService.indexUserContent(
      userId,
      documents,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /api/v1/rag/stats
   * Retorna estatísticas do sistema RAG (para dashboard de admin).
   */
  @Get('stats')
  getStats() {
    return {
      success: true,
      data: this.ragService.getStats(),
    };
  }

  @Delete('cache')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async clearCache(@Req() req: Request) {
    await this.semanticCache.clearAll();
    await this.audit.log({
      actorId: (req as any).user?.userId,
      action: AUDIT_ACTIONS.CACHE_CLEAR_ALL,
      resource: 'SemanticCacheEntry',
      req,
    });
    return { success: true, message: 'Cache semântico limpo.' };
  }

  @Delete('cache/:userId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  async clearUserCache(
    @Param('userId') userId: string,
    @Req() req: Request,
  ) {
    await this.semanticCache.invalidateUserCache(userId);
    await this.audit.log({
      actorId: (req as any).user?.userId,
      action: AUDIT_ACTIONS.CACHE_CLEAR_USER,
      resource: 'SemanticCacheEntry',
      resourceId: userId,
      req,
    });
    return { success: true, message: `Cache do usuário ${userId} limpo.` };
  }
}
