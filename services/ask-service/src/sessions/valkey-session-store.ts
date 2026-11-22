import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RequestContext } from '@second-memory/shared-types';
import { randomUUID } from 'node:crypto';
import type { BaseClient, Script } from '@valkey/valkey-glide';
import type { SessionState, SessionStore, SessionTransaction } from './session-store';

// The lease outlasts Lambda's 70-second request deadline. The token fences
// each update if a process times out, freezes, or loses its connection.
const LEASE_MS = '75000';
const ACQUIRE = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  if ARGV[5] == '' then return 'missing' end
  raw = ARGV[5]
end
local state = cjson.decode(raw)
if state.tenantId ~= ARGV[1] or state.userId ~= ARGV[2] then return 'forbidden' end
if not redis.call('SET', KEYS[2], ARGV[3], 'NX', 'PX', ARGV[4]) then return 'busy' end
redis.call('SET', KEYS[1], raw, 'PX', ARGV[6])
return raw
`;
const UPDATE = `
if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
if ARGV[2] == 'release' then
  redis.call('DEL', KEYS[2])
elseif ARGV[2] == 'remove' then
  redis.call('DEL', KEYS[1])
else
  if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
  redis.call('SET', KEYS[1], ARGV[3], 'PX', ARGV[4])
end
return 1
`;

@Injectable()
export class ValkeySessionStore implements SessionStore, OnModuleDestroy {
  private readonly ttlMs: number;
  private client?: Promise<BaseClient>;
  private scripts?: { acquire: Script; update: Script };

  constructor(private readonly config: ConfigService) {
    this.ttlMs = config.getOrThrow<number>('session.ttlMs');
    if (!Number.isSafeInteger(this.ttlMs) || this.ttlMs <= 0) {
      throw new Error('SESSION_TTL_MS must be a positive integer');
    }
  }

  async withSession<T>(
    context: RequestContext,
    sessionId: string | undefined,
    operation: (session: SessionTransaction) => Promise<T>,
  ): Promise<T> {
    const id = sessionId ?? randomUUID();
    const token = randomUUID();
    const keys = [`ask:{${id}}:session`, `ask:{${id}}:lease`];
    const initial: SessionState = {
      ...context,
      sessionId: id,
      turns: [],
      expiresAt: Date.now() + this.ttlMs,
    };
    const raw = await this.run('acquire', keys, [
      context.tenantId,
      context.userId,
      token,
      LEASE_MS,
      sessionId ? '' : JSON.stringify(initial),
      String(this.ttlMs),
    ]);
    if (raw === 'missing') {
      throw new NotFoundException(`Session ${id} not found or expired`);
    }
    if (raw === 'forbidden') {
      throw new ForbiddenException(
        'Session does not belong to the authenticated user',
      );
    }
    if (raw === 'busy') {
      throw new ConflictException('Another session operation is in progress');
    }
    if (typeof raw !== 'string') {
      throw new ServiceUnavailableException('Session store unavailable');
    }
    const state = JSON.parse(raw) as SessionState;
    const update = async (action: 'save' | 'remove', value = '') => {
      if (
        (await this.run('update', keys, [
          token,
          action,
          value,
          String(this.ttlMs),
        ])) !== 1
      ) {
        throw new ConflictException('Session operation expired');
      }
    };
    try {
      return await operation({
        state,
        save: () => {
          state.expiresAt = Date.now() + this.ttlMs;
          return update('save', JSON.stringify(state));
        },
        remove: () => update('remove'),
      });
    } finally {
      // If the cache is temporarily unreachable the lease expires by itself.
      await this.run('update', keys, [token, 'release']).catch(() => undefined);
    }
  }

  async deleteSession(
    context: RequestContext,
    sessionId: string,
  ): Promise<void> {
    try {
      await this.withSession(context, sessionId, (session) => session.remove());
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    const client = await this.client;
    client?.close();
    this.scripts?.acquire.release();
    this.scripts?.update.release();
  }

  private async run(
    script: 'acquire' | 'update',
    keys: string[],
    args: string[],
  ) {
    try {
      this.client ??= this.connect().catch((error: unknown) => {
        this.client = undefined;
        throw error;
      });
      const client = await this.client;
      return await client.invokeScript(this.scripts![script], { keys, args });
    } catch {
      throw new ServiceUnavailableException('Session store unavailable');
    }
  }

  private async connect(): Promise<BaseClient> {
    const { GlideClient, GlideClusterClient, Script, ServiceType } =
      await import('@valkey/valkey-glide');
    this.scripts ??= {
      acquire: new Script(ACQUIRE),
      update: new Script(UPDATE),
    };
    const requestTimeout = 2000;
    const advancedConfiguration = { connectionTimeout: 2000 };
    const local = this.config.get<string>('session.testRedisUrl');
    if (local) {
      const url = new URL(local);
      return GlideClient.createClient({
        addresses: [{ host: url.hostname, port: Number(url.port || 6379) }],
        requestTimeout,
        advancedConfiguration,
      });
    }
    return GlideClusterClient.createClient({
      addresses: [
        {
          host: this.config.getOrThrow<string>('session.cacheHost'),
          port: this.config.getOrThrow<number>('session.cachePort'),
        },
      ],
      useTLS: true,
      credentials: {
        username: this.config.getOrThrow<string>('session.cacheUser'),
        iamConfig: {
          clusterName: this.config.getOrThrow<string>('session.cacheName'),
          region: this.config.getOrThrow<string>('awsRegion'),
          service: ServiceType.Elasticache,
        },
      },
      requestTimeout,
      advancedConfiguration,
    });
  }
}
