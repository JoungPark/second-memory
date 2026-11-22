import type { RequestContext } from '@second-memory/shared-types';

export interface SessionTurn {
  role: 'user' | 'assistant';
  content: string;
  citedMemoryIds?: string[];
}

export interface SessionState {
  sessionId: string;
  tenantId: string;
  userId: string;
  turns: SessionTurn[];
  expiresAt: number;
  pendingSummary?: { text: string; references: string[] };
}

export interface SessionTransaction {
  state: SessionState;
  save(): Promise<void>;
  remove(): Promise<void>;
}

export abstract class SessionStore {
  abstract withSession<T>(
    context: RequestContext,
    sessionId: string | undefined,
    operation: (session: SessionTransaction) => Promise<T>,
  ): Promise<T>;

  abstract deleteSession(context: RequestContext, sessionId: string): void | Promise<void>;
}
