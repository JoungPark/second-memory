import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import type { RequestContext } from '@second-memory/shared-types';
import type { SessionState, SessionStore, SessionTransaction } from './session-store';

@Injectable()
export class SessionStoreService implements SessionStore {
  private readonly sessions = new Map<string, SessionState>();
  private readonly busy = new Set<string>();
  private readonly ttlMs: number;

  constructor(private readonly configService: ConfigService) {
    this.ttlMs = this.configService.get<number>('session.ttlMs', 3600000);
  }

  async withSession<T>(
    context: RequestContext,
    sessionId: string | undefined,
    operation: (session: SessionTransaction) => Promise<T>,
  ): Promise<T> {
    const state = this.resolveSession(context, sessionId);
    if (this.busy.has(state.sessionId)) {
      throw new ConflictException('Another session operation is in progress');
    }
    this.busy.add(state.sessionId);
    try {
      return await operation({
        state,
        save: () => {
          state.expiresAt = Date.now() + this.ttlMs;
          this.sessions.set(state.sessionId, state);
          return Promise.resolve();
        },
        remove: () => {
          this.sessions.delete(state.sessionId);
          return Promise.resolve();
        },
      });
    } finally {
      this.busy.delete(state.sessionId);
    }
  }

  resolveSession(context: RequestContext, sessionId?: string): SessionState {
    this.evictExpiredSessions();

    if (sessionId) {
      const existing = this.sessions.get(sessionId);
      if (!existing) {
        throw new NotFoundException(
          `Session ${sessionId} not found or expired`,
        );
      }

      if (
        existing.tenantId !== context.tenantId ||
        existing.userId !== context.userId
      ) {
        throw new ForbiddenException(
          'Session does not belong to the authenticated user',
        );
      }

      existing.expiresAt = Date.now() + this.ttlMs;
      return existing;
    }

    const created: SessionState = {
      sessionId: randomUUID(),
      tenantId: context.tenantId,
      userId: context.userId,
      turns: [],
      expiresAt: Date.now() + this.ttlMs,
    };

    this.sessions.set(created.sessionId, created);
    return created;
  }

  deleteSession(context: RequestContext, sessionId: string): void {
    this.evictExpiredSessions();

    const existing = this.sessions.get(sessionId);
    if (!existing) {
      return;
    }

    if (
      existing.tenantId !== context.tenantId ||
      existing.userId !== context.userId
    ) {
      throw new ForbiddenException(
        'Session does not belong to the authenticated user',
      );
    }

    if (this.busy.has(sessionId)) {
      throw new ConflictException('Another session operation is in progress');
    }
    this.sessions.delete(sessionId);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  cleanupExpiredSessions(): void {
    this.evictExpiredSessions();
  }

  private evictExpiredSessions(): void {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
