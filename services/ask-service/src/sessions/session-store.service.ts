import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import type { RequestContext } from '@second-memory/shared-types';

export interface SessionTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionState {
  sessionId: string;
  tenantId: string;
  userId: string;
  turns: SessionTurn[];
  expiresAt: number;
}

@Injectable()
export class SessionStoreService {
  private readonly sessions = new Map<string, SessionState>();
  private readonly ttlMs: number;

  constructor(private readonly configService: ConfigService) {
    this.ttlMs = this.configService.get<number>('session.ttlMs', 3600000);
  }

  resolveSession(context: RequestContext, sessionId?: string): SessionState {
    this.evictExpiredSessions();

    if (sessionId) {
      const existing = this.sessions.get(sessionId);
      if (!existing) {
        throw new NotFoundException(`Session ${sessionId} not found or expired`);
      }

      if (
        existing.tenantId !== context.tenantId ||
        existing.userId !== context.userId
      ) {
        throw new ForbiddenException('Session does not belong to the authenticated user');
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

  appendTurn(session: SessionState, turn: SessionTurn): void {
    session.turns.push(turn);
    session.expiresAt = Date.now() + this.ttlMs;
    this.sessions.set(session.sessionId, session);
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
