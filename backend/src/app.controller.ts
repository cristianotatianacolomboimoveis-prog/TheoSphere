import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
  DefaultValuePipe,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { OrchestratorService } from './orchestrator.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

/**
 * AI utility endpoints. Identity is always sourced from the JWT — body-level
 * `userId` was removed (SEC-001: SimpleAuthGuard accepted `X-User-ID` header
 * and the controller accepted a body field, both of which allowed account
 * impersonation).
 */
class CompareTheologyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  topic!: string;
}

@Controller('api/v1/ai')
export class AppController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('compare')
  @UseGuards(JwtAuthGuard)
  async compareTheology(@Body() body: CompareTheologyDto, @Req() req: Request) {
    const userId = req.user?.userId;
    if (!userId) {
      // Should be unreachable — JwtAuthGuard already validated.
      throw new BadRequestException('missing user context');
    }
    const result = await this.orchestratorService.compareTheology(
      body.topic,
      userId,
    );
    return { success: true, data: result };
  }

  /**
   * Locations dataset. Paginated to avoid shipping the whole biblical-atlas
   * payload on every page-load (P-3 in the audit).
   */
  @Get('locations')
  async getLocations(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 200); // hard cap at 200
    const raw = await this.orchestratorService.getAllLocations();
    const locations: unknown[] = Array.isArray(raw) ? raw : [];
    const start = (safePage - 1) * safeLimit;
    const slice = locations.slice(start, start + safeLimit);
    return {
      success: true,
      data: slice,
      meta: {
        page: safePage,
        limit: safeLimit,
        total: locations.length,
        hasMore: start + safeLimit < locations.length,
      },
    };
  }
}
