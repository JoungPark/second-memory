import { CreateTableCommand, DeleteTableCommand, DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { DynamoDbSessionStore } from './dynamodb-session-store';
import type { SessionTransaction } from './session-store';

const endpoint = process.env.ASK_TEST_DYNAMODB_ENDPOINT;
const describeDynamoDb = endpoint ? describe : describe.skip;

describeDynamoDb('DynamoDB session store across instances', () => {
  const context = { tenantId: 'tenant', userId: 'owner' };
  const tableName = `ask-sessions-test-${randomUUID()}`;
  const ttlMs = 60 * 60 * 1000;
  const config = new ConfigService({ session: { tableName, ttlMs } });
  const clientOptions = {
    endpoint,
    region: 'us-east-1',
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
    maxAttempts: 1,
  };
  const firstClient = new DynamoDBClient(clientOptions);
  const secondClient = new DynamoDBClient(clientOptions);
  const first = new DynamoDbSessionStore(config, firstClient);
  const second = new DynamoDbSessionStore(config, secondClient);

  beforeAll(async () => {
    // Leave TTL deletion disabled so tests can check expiry while the item still exists.
    await firstClient.send(
      new CreateTableCommand({
        TableName: tableName,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [{ AttributeName: 'sessionId', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'sessionId', KeyType: 'HASH' }],
      }),
    );
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    try {
      await firstClient.send(new DeleteTableCommand({ TableName: tableName }));
    } finally {
      first.onModuleDestroy();
      second.onModuleDestroy();
    }
  });

  const sessionIdOf = ({ state }: SessionTransaction) => Promise.resolve(state.sessionId);

  it('shares ordered turns and excludes overlapping and cross-owner operations', async () => {
    const id = await first.withSession(context, undefined, async ({ state, save }) => {
      await expect(second.deleteSession(context, state.sessionId)).rejects.toMatchObject({ status: 409 });
      await expect(second.deleteSession({ ...context, userId: 'other' }, state.sessionId)).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        second.withSession({ ...context, tenantId: 'other' }, state.sessionId, sessionIdOf),
      ).rejects.toMatchObject({ status: 403 });

      state.turns.push(
        { role: 'user', content: 'One' },
        { role: 'assistant', content: 'Two', citedMemoryIds: ['memory-1'] },
      );
      await save();
      return state.sessionId;
    });

    const turns = await second.withSession(context, id, ({ state }) => Promise.resolve(state.turns));
    expect(turns).toEqual([
      { role: 'user', content: 'One' },
      { role: 'assistant', content: 'Two', citedMemoryIds: ['memory-1'] },
    ]);
    await second.deleteSession(context, id);
    await expect(second.deleteSession(context, id)).resolves.toBeUndefined();
    await expect(first.withSession(context, id, sessionIdOf)).rejects.toMatchObject({ status: 404 });
  });

  it('refreshes expiry on owner access and rejects expired items before TTL deletion', async () => {
    let now = Date.now() + 123;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const id = await first.withSession(context, undefined, sessionIdOf);

    now += ttlMs - 1;
    await second.withSession(context, id, ({ state }) => {
      expect(state.expiresAt).toBe(now + ttlMs);
      return Promise.resolve();
    });
    now += ttlMs;

    const { Item } = await firstClient.send(
      new GetItemCommand({
        TableName: tableName,
        Key: { sessionId: { S: id } },
        ConsistentRead: true,
      }),
    );
    expect(Item?.expiresAt?.N).toBe(String(now));
    expect(Item?.ttl?.N).toBe(String(Math.ceil(now / 1000)));
    await expect(first.withSession(context, id, sessionIdOf)).rejects.toMatchObject({ status: 404 });
    await expect(second.deleteSession(context, id)).resolves.toBeUndefined();
  });

  it('fences a timed-out operation and its release after lease takeover', async () => {
    let now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const id = await first.withSession(context, undefined, sessionIdOf);
    const previous = await first.withSession(context, id, async (old) => {
      now += 75_000;
      return second.withSession(context, id, async ({ state, save }) => {
        state.turns.push({ role: 'user', content: 'Current' });
        await save();
        await expect(old.save()).rejects.toMatchObject({ status: 409 });
        await expect(old.remove()).rejects.toMatchObject({ status: 409 });
        return old;
      });
    });

    await expect(previous.save()).rejects.toMatchObject({ status: 409 });
    await expect(first.withSession(context, id, ({ state }) => Promise.resolve(state.turns))).resolves.toEqual([
      { role: 'user', content: 'Current' },
    ]);
  });

  it('keeps a pending summary after the downstream save fails', async () => {
    const id = await first.withSession(context, undefined, sessionIdOf);
    const pendingSummary = { text: 'Saved once', references: ['memory-1'] };
    await expect(
      first.withSession(context, id, async ({ state, save }) => {
        state.pendingSummary = pendingSummary;
        await save();
        throw new Error('Lost response from Memory');
      }),
    ).rejects.toThrow('Lost response from Memory');

    await second.withSession(context, id, async ({ state, remove }) => {
      expect(state.pendingSummary).toEqual(pendingSummary);
      await remove();
    });
    await expect(first.withSession(context, id, sessionIdOf)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects oversized UTF-8 turns and pending summaries without overwriting saved history', async () => {
    const savedTurn = { role: 'user', content: 'Saved history' } as const;
    const id = await first.withSession(context, undefined, async ({ state, save }) => {
      state.turns.push(savedTurn);
      await save();
      return state.sessionId;
    });

    await expect(
      first.withSession(context, id, async ({ state, save }) => {
        state.turns.push({ role: 'assistant', content: 'あ'.repeat(90_000) });
        await save();
      }),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      second.withSession(context, id, async ({ state, save }) => {
        state.pendingSummary = { text: 'あ'.repeat(132_000), references: [] };
        await save();
      }),
    ).rejects.toMatchObject({ status: 413 });

    await first.withSession(context, id, async ({ state, remove }) => {
      expect(state.turns).toEqual([savedTurn]);
      expect(state.pendingSummary).toBeUndefined();
      await remove();
    });
  });

  it('maps a failed DynamoDB request to 503', async () => {
    jest.spyOn(firstClient, 'send').mockImplementationOnce(async () => {
      throw new Error('Connection closed');
    });
    const operation = jest.fn(sessionIdOf);
    await expect(first.withSession(context, undefined, operation)).rejects.toMatchObject({ status: 503 });
    expect(operation).not.toHaveBeenCalled();
  });
});
