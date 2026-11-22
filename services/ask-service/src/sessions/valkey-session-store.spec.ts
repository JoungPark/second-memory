import { ConfigService } from '@nestjs/config';
import { ValkeySessionStore } from './valkey-session-store';

const redisUrl = process.env.ASK_TEST_REDIS_URL;
const describeRedis = redisUrl ? describe : describe.skip;

describeRedis('Valkey session store across instances', () => {
  const context = { tenantId: 'tenant', userId: 'owner' };
  const config = new ConfigService({
    session: { ttlMs: 1000, testRedisUrl: redisUrl },
  });
  const first = new ValkeySessionStore(config);
  const second = new ValkeySessionStore(config);
  afterAll(async () => {
    await Promise.all([first.onModuleDestroy(), second.onModuleDestroy()]);
  });

  it('shares ordered turns and excludes overlapping and cross-user operations', async () => {
    const id = await first.withSession(
      context,
      undefined,
      async ({ state, save }) => {
        await expect(
          second.deleteSession(context, state.sessionId),
        ).rejects.toMatchObject({ status: 409 });
        await expect(
          second.deleteSession(
            { ...context, userId: 'other' },
            state.sessionId,
          ),
        ).rejects.toMatchObject({ status: 403 });
        state.turns.push(
          { role: 'user', content: 'One' },
          { role: 'assistant', content: 'Two' },
        );
        await save();
        return state.sessionId;
      },
    );
    const turns = await second.withSession(context, id, ({ state }) =>
      Promise.resolve(state.turns),
    );
    expect(turns.map((turn) => turn.content)).toEqual(['One', 'Two']);
    await second.deleteSession(context, id);
    await expect(
      first.withSession(context, id, jest.fn()),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('refreshes the TTL on owner access and expires after inactivity', async () => {
    const id = await first.withSession(context, undefined, ({ state }) =>
      Promise.resolve(state.sessionId),
    );
    await new Promise((resolve) => setTimeout(resolve, 650));
    await second.withSession(context, id, () => Promise.resolve());
    await new Promise((resolve) => setTimeout(resolve, 650));
    await first.withSession(context, id, () => Promise.resolve());
    await new Promise((resolve) => setTimeout(resolve, 1050));
    await expect(
      second.withSession(context, id, jest.fn()),
    ).rejects.toMatchObject({ status: 404 });
  });
});
