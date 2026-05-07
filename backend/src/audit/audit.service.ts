import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';
import {
  EVENT_CHANNELS,
  EventBusService,
} from '../events/event-bus.service';

/**
 * Stable, dot-namespaced identifiers for privileged actions.
 *
 * Add new actions here rather than passing free-form strings, so dashboards
 * and retention rules have a closed vocabulary. Prefer present-tense verbs.
 */
export const AUDIT_ACTIONS = {
  USER_ROLE_UPDATE: 'user.role.update',
  USER_DELETE: 'user.delete',
  CACHE_CLEAR_ALL: 'cache.clear.all',
  CACHE_CLEAR_USER: 'cache.clear.user',
  INSTITUTION_CREATE: 'institution.create',
  DEBATE_DELETE: 'debate.delete',
  AUTH_LOGIN_FAIL: 'auth.login.fail',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditContext {
  actorId?: string | null;
  action: AuditAction | string;
  resource: string;
  resourceId?: string | null;
  payload?: Record<string, unknown> | null;
  /** Express request — used to capture IP + UA. Optional. */
  req?: Request;
}

/**
 * Append-only writer for the AuditLog table.
 *
 * Failure-mode policy: never let an audit-write failure abort the caller.
 * We log and emit a Pub/Sub event, then swallow the error. Audit gaps are
 * preferable to user-visible 500s (and the loss is recoverable from app-
 * level structured logs as a last-resort backup).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  // Keys we will never persist — even if a careless caller drops them in.
  private readonly REDACT_KEYS = new Set([
    'password',
    'passwordHash',
    'token',
    'authorization',
    'jwt',
    'apiKey',
    'api_key',
    'secret',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBusService,
  ) {}

  async log(ctx: AuditContext): Promise<void> {
    const { actorId, action, resource, resourceId, payload, req } = ctx;

    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: actorId ?? null,
          action,
          resource,
          resourceId: resourceId ?? null,
          payload: payload
            ? (this.redact(payload) as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          ip: req ? this.extractIp(req) : null,
          userAgent: req?.headers?.['user-agent']?.toString() ?? null,
        },
      });
    } catch (err) {
      // Never throw from audit. Surface via logs + bus instead.
      this.logger.warn(
        `audit.log failed (${action} on ${resource}): ${(err as Error).message}`,
      );
    }

    // Best-effort fan-out to dashboards / external sinks.
    this.events.publishLog('log', 'audit', action, {
      actorId,
      resource,
      resourceId,
    });
  }

  // ─── helpers ────────────────────────────────────────────────────────────

  private redact(input: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (this.REDACT_KEYS.has(k)) {
        out[k] = '[REDACTED]';
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = this.redact(v as Record<string, unknown>);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  private extractIp(req: Request): string | null {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string') return xff.split(',')[0].trim();
    if (Array.isArray(xff) && xff.length > 0) return xff[0];
    return req.ip ?? req.socket?.remoteAddress ?? null;
  }
}
