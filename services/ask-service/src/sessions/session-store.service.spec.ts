import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { RequestContext } from '@second-memory/shared-types';
import { SessionStoreService } from './session-store.service';

describe('SessionStoreService', () => {
  let service: SessionStoreService;

  const context: RequestContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionStoreService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'session.ttlMs') {
                return 3600000;
              }

              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(SessionStoreService);
  });

  it('creates a new session when sessionId is omitted', () => {
    const session = service.resolveSession(context);

    expect(session.sessionId).toBeDefined();
    expect(session.tenantId).toBe('tenant-1');
    expect(session.userId).toBe('user-1');
    expect(session.turns).toEqual([]);
  });

  it('reuses a session for the same user', () => {
    const created = service.resolveSession(context);
    const reused = service.resolveSession(context, created.sessionId);

    expect(reused.sessionId).toBe(created.sessionId);
  });

  it('rejects access to another user session', () => {
    const created = service.resolveSession(context);

    expect(() =>
      service.resolveSession(
        { tenantId: 'tenant-1', userId: 'user-2' },
        created.sessionId,
      ),
    ).toThrow(ForbiddenException);
  });

  it('throws when session is missing', () => {
    expect(() => service.resolveSession(context, 'missing-session')).toThrow(
      NotFoundException,
    );
  });

  it('evicts expired sessions on access', () => {
    jest.useFakeTimers();

    const created = service.resolveSession(context);
    jest.setSystemTime(Date.now() + 3600001);

    expect(() => service.resolveSession(context, created.sessionId)).toThrow(
      NotFoundException,
    );

    jest.useRealTimers();
  });
});
