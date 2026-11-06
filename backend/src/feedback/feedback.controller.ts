import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { FeedbackService } from './feedback.service';
import type { FeedbackInput } from './feedback.service';

@Controller('api/v1/feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  /**
   * Aceita visitante (quem não conseguiu entrar também precisa relatar).
   * userId vem só do JWT, se houver; qualquer userId no corpo é ignorado.
   */
  @Post()
  @HttpCode(201)
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async create(@Req() req: Request, @Body() body: FeedbackInput) {
    const user = (req as any).user as { userId?: string } | null | undefined;
    const saved = await this.feedback.create(user?.userId ?? null, body ?? {});
    return { success: true, data: saved };
  }
}
