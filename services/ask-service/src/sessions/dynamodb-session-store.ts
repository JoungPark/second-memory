import {
  ConditionalCheckFailedException,
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  type AttributeValue,
} from '@aws-sdk/client-dynamodb';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RequestContext } from '@second-memory/shared-types';
import { randomUUID } from 'node:crypto';
import type { SessionState, SessionStore, SessionTransaction } from './session-store';

// A crashed execution loses its lease after Lambda's 70-second deadline.
const LEASE_MS = 75_000;
const REQUEST_TIMEOUT_MS = 2_000;
const MAX_TURNS_BYTES = 256 * 1024;
const MAX_PAYLOAD_BYTES = 384 * 1024;
const HELD_LEASE = 'leaseToken = :token AND leaseExpiresAt > :now AND expiresAt > :now';

function numberAttribute(value: number): AttributeValue {
  return { N: String(value) };
}

function expiryAttributes(expiresAt: number) {
  return {
    ':expiresAt': numberAttribute(expiresAt),
    ':ttl': numberAttribute(Math.ceil(expiresAt / 1000)),
  };
}

function parsePayload(value: string | undefined): Pick<SessionState, 'turns' | 'pendingSummary'> {
  try {
    const payload = JSON.parse(value ?? '') as Pick<SessionState, 'turns' | 'pendingSummary'>;
    if (Array.isArray(payload.turns)) {
      return { turns: payload.turns, pendingSummary: payload.pendingSummary };
    }
  } catch {
    // A stored session with an unreadable payload cannot be resumed safely.
  }
  throw new ServiceUnavailableException('Session store unavailable');
}

@Injectable()
export class DynamoDbSessionStore implements SessionStore, OnModuleDestroy {
  private readonly logger = new Logger(DynamoDbSessionStore.name);
  private readonly tableName: string;
  private readonly ttlMs: number;

  constructor(
    config: ConfigService,
    private readonly client: DynamoDBClient,
  ) {
    this.tableName = config.getOrThrow<string>('session.tableName');
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
    const token = { S: randomUUID() };
    const item = { TableName: this.tableName, Key: { sessionId: { S: id } } };
    const now = Date.now();
    const state: SessionState = { ...context, sessionId: id, turns: [], expiresAt: now + this.ttlMs };
    const expiry = expiryAttributes(state.expiresAt);
    const owner = { tenantId: { S: context.tenantId }, userId: { S: context.userId } };
    const lease = { leaseToken: token, leaseExpiresAt: numberAttribute(now + LEASE_MS) };
    const values = () => ({ ':token': token, ':now': numberAttribute(Date.now()) });

    let storedPayload = '{"turns":[]}';
    try {
      if (sessionId) {
        const { Attributes } = await this.run((abortSignal) =>
          this.client.send(
            new UpdateItemCommand({
              ...item,
              ConditionExpression:
                'expiresAt > :now AND tenantId = :tenant AND userId = :user AND (attribute_not_exists(leaseToken) OR leaseExpiresAt <= :now)',
              UpdateExpression:
                'SET leaseToken = :token, leaseExpiresAt = :leaseEnd, expiresAt = :expiresAt, #ttl = :ttl',
              ExpressionAttributeNames: { '#ttl': 'ttl' },
              ExpressionAttributeValues: {
                ':now': numberAttribute(now),
                ':tenant': owner.tenantId,
                ':user': owner.userId,
                ':token': token,
                ':leaseEnd': lease.leaseExpiresAt,
                ...expiry,
              },
              ReturnValues: 'ALL_NEW',
              ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
            }),
            { abortSignal },
          ),
        );
        storedPayload = Attributes?.payload?.S ?? '';
      } else {
        await this.run((abortSignal) =>
          this.client.send(
            new PutItemCommand({
              TableName: this.tableName,
              ConditionExpression: 'attribute_not_exists(sessionId)',
              Item: {
                ...item.Key,
                ...owner,
                ...lease,
                expiresAt: expiry[':expiresAt'],
                ttl: expiry[':ttl'],
                payload: { S: storedPayload },
              },
            }),
            { abortSignal },
          ),
        );
      }
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
      if (sessionId) {
        const existing = error.Item;
        if (!existing?.expiresAt?.N || Number(existing.expiresAt.N) <= now) {
          throw new NotFoundException(`Session ${id} not found or expired`);
        }
        if (existing.tenantId?.S !== context.tenantId || existing.userId?.S !== context.userId) {
          throw new ForbiddenException('Session does not belong to the authenticated user');
        }
      }
      throw new ConflictException('Another session operation is in progress');
    }

    try {
      Object.assign(state, parsePayload(storedPayload));
      return await operation({
        state,
        save: async () => {
          const payload = JSON.stringify({ turns: state.turns, pendingSummary: state.pendingSummary });
          if (
            Buffer.byteLength(JSON.stringify(state.turns)) > MAX_TURNS_BYTES ||
            Buffer.byteLength(payload) > MAX_PAYLOAD_BYTES
          ) {
            throw new PayloadTooLargeException('Conversation is too large to store');
          }
          const expiresAt = Date.now() + this.ttlMs;
          await this.writeWithLease((abortSignal) =>
            this.client.send(
              new UpdateItemCommand({
                ...item,
                ConditionExpression: HELD_LEASE,
                UpdateExpression: 'SET payload = :payload, expiresAt = :expiresAt, #ttl = :ttl',
                ExpressionAttributeNames: { '#ttl': 'ttl' },
                ExpressionAttributeValues: { ...values(), ...expiryAttributes(expiresAt), ':payload': { S: payload } },
              }),
              { abortSignal },
            ),
          );
          state.expiresAt = expiresAt;
        },
        remove: () =>
          this.writeWithLease((abortSignal) =>
            this.client.send(
              new DeleteItemCommand({
                ...item,
                ConditionExpression: HELD_LEASE,
                ExpressionAttributeValues: values(),
              }),
              { abortSignal },
            ),
          ),
      });
    } finally {
      // Only the holder can release the lease. Failed releases expire on their own.
      await this.run((abortSignal) =>
        this.client.send(
          new UpdateItemCommand({
            ...item,
            ConditionExpression: 'leaseToken = :token',
            UpdateExpression: 'REMOVE leaseToken, leaseExpiresAt',
            ExpressionAttributeValues: { ':token': token },
          }),
          { abortSignal },
        ),
      ).catch(() => undefined);
    }
  }

  async deleteSession(context: RequestContext, sessionId: string): Promise<void> {
    try {
      await this.withSession(context, sessionId, (session) => session.remove());
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  private async writeWithLease(send: (abortSignal: AbortSignal) => Promise<unknown>): Promise<void> {
    try {
      await this.run(send);
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new ConflictException('Session operation expired');
      }
      throw error;
    }
  }

  private async run<T>(send: (abortSignal: AbortSignal) => Promise<T>): Promise<T> {
    try {
      return await send(AbortSignal.timeout(REQUEST_TIMEOUT_MS));
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw error;
      }
      this.logger.warn(`DynamoDB session request failed (${error instanceof Error ? error.name : 'unknown'})`);
      throw new ServiceUnavailableException('Session store unavailable');
    }
  }
}
