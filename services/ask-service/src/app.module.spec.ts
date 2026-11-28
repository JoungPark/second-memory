import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { OpenAiCompatibleService } from './llm/openai-compatible.service';
import { SessionStore } from './sessions/session-store';
import { SessionStoreService } from './sessions/session-store.service';

afterEach(() => jest.restoreAllMocks());

it('serves Lambda health without connecting to dependencies', async () => {
  jest.replaceProperty(process, 'env', { ...process.env, SESSION_TABLE_NAME: 'health-test-sessions' });
  const module = await Test.createTestingModule({
    imports: [AppModule.forProfile(true)],
  }).compile();
  const app = module.createNestApplication();
  await app.listen(0, '127.0.0.1');
  try {
    const response = await fetch(`${await app.getUrl()}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 'ok',
      service: 'ask-service',
    });
  } finally {
    await app.close();
  }
});

it.each(['standalone', 'lambda'] as const)('resolves and propagates identity in the %s profile', async (profile) => {
  const lambda = profile === 'lambda';
  const userUrl = lambda ? 'https://user.example.test' : 'http://127.0.0.1:3003';
  const memoryUrl = 'https://memory.example.test';
  const owner = {
    tenantId: '00000000-0000-4000-8000-000000000001',
    userId: '00000000-0000-4000-8000-000000000002',
  };
  const secondAccount = {
    tenantId: '00000000-0000-4000-8000-000000000003',
    userId: '00000000-0000-4000-8000-000000000004',
  };
  const upstream = new Map<string, { body: unknown; headers: Headers }>();
  let identityStatus = 200;
  const sendToAsk = globalThis.fetch.bind(globalThis);
  const fetchUpstream = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    upstream.set(url, { body: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) });
    switch (url) {
      case `${userUrl}/internal/v1/auth/resolve`:
        return Response.json(
          String(init?.body).includes('second-account') ? secondAccount : owner,
          { status: identityStatus },
        );
      case `${memoryUrl}/internal/v1/memories/search`:
        return Response.json({
          results: [
            {
              id: 'existing-memory',
              entryType: 'note',
              content: 'Existing note',
              occurredAt: '2026-11-01T00:00:00Z',
              score: 1,
            },
          ],
        });
      case `${memoryUrl}/internal/v1/memories`:
        return Response.json({ id: 'saved-summary' }, { status: 201 });
      default:
        throw new Error(`Unexpected upstream URL ${url}`);
    }
  });
  jest.replaceProperty(process, 'env', {
    ...process.env,
    AWS_LAMBDA_HTTP_ENDPOINT: lambda ? '127.0.0.1:8080' : undefined,
    AWS_REGION: 'ap-southeast-2',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
    AWS_SESSION_TOKEN: 'test-session-token',
    AWS_CREDENTIAL_EXPIRATION: undefined,
    AWS_PROFILE: undefined,
    USER_SERVICE_URL: lambda ? `${userUrl}/` : '',
    MEMORY_SERVICE_URL: memoryUrl,
  });
  const chat = jest.fn().mockResolvedValue({ content: 'Response' });
  const module = await Test.createTestingModule({ imports: [AppModule.forProfile(lambda)] })
    .overrideProvider(SessionStore)
    .useClass(SessionStoreService)
    .overrideProvider(OpenAiCompatibleService)
    .useValue({ chat })
    .compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  try {
    await app.listen(0, '127.0.0.1');
    const sessionId = await app.get(SessionStore).withSession(owner, undefined, async ({ state, save }) => {
      state.turns.push({ role: 'user', content: 'Earlier question' });
      await save();
      return state.sessionId;
    });
    const baseUrl = await app.getUrl();
    const post = (path: string, body: object, token?: string) =>
      sendToAsk(`${baseUrl}/v1/ask/${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': 'client-tenant',
          'x-user-id': 'client-user',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
    const message = { sessionId, message: 'Find the existing note' };
    expect((await post('messages', message)).status).toBe(401);
    expect(fetchUpstream).not.toHaveBeenCalled();
    expect((await post('messages', message, 'second-account')).status).toBe(403);

    const reply = await post('messages', message, 'firebase-token');
    expect(reply.status).toBe(201);
    expect(await reply.json()).toMatchObject({ sessionId, citations: [{ memoryId: 'existing-memory' }] });
    expect(chat).toHaveBeenCalledWith(expect.arrayContaining([{ role: 'user', content: 'Earlier question' }]));
    const end = await post('end', { sessionId }, 'firebase-token');
    expect(end.status).toBe(201);
    expect(await end.json()).toMatchObject({ summaryId: 'saved-summary' });

    const identity = upstream.get(`${userUrl}/internal/v1/auth/resolve`);
    expect(identity?.body).toEqual({ idToken: 'firebase-token' });
    expect(identity?.headers.get('x-user-id')).toBeNull();
    for (const path of ['/internal/v1/memories/search', '/internal/v1/memories']) {
      const { body, headers } = upstream.get(memoryUrl + path)!;
      expect(headers.get('x-tenant-id')).toBe(owner.tenantId);
      expect(headers.get('x-user-id')).toBe(owner.userId);
      expect(JSON.stringify(body)).not.toContain('firebase-token');
    }
    for (const { headers } of upstream.values()) {
      if (lambda) {
        expect(headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 /);
        expect(headers.has('x-amz-content-sha256')).toBe(true);
      } else {
        expect(headers.get('authorization')).toBeNull();
      }
    }

    fetchUpstream.mockClear();
    for (const [upstreamStatus, askStatus] of [
      [401, 401],
      [403, 503],
      [503, 503],
    ]) {
      identityStatus = upstreamStatus;
      expect((await post('messages', message, 'firebase-token')).status).toBe(askStatus);
    }
    expect(fetchUpstream).toHaveBeenCalledTimes(3);
    for (const [url] of fetchUpstream.mock.calls) expect(String(url)).toBe(`${userUrl}/internal/v1/auth/resolve`);
  } finally {
    await app.close();
  }
});
