import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OpenAPIObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { configureHttp } from './app-http';
import { PrismaService } from './database/prisma.service';
import { MemoriesService } from './memories/memories.service';

describe('Lambda Web HTTP profile', () => {
  const origin = 'https://preview.example.com';
  const userServiceUrl = 'https://users.example.test';
  const owner = {
    tenantId: '00000000-0000-4000-8000-000000000001',
    userId: '00000000-0000-4000-8000-000000000002',
  };
  let app: INestApplication;
  let fetchIdentity: jest.SpiedFunction<typeof fetch>;
  let listMemories: jest.SpiedFunction<MemoriesService['listMemories']>;
  let environment: { restore(): void };

  beforeAll(async () => {
    environment = jest.replaceProperty(process, 'env', {
      ...process.env,
      CORS_ORIGINS: origin,
      AWS_LAMBDA_HTTP_ENDPOINT: '127.0.0.1:8080',
      USER_SERVICE_URL: userServiceUrl,
      AWS_REGION: 'ap-southeast-2',
      AWS_ACCESS_KEY_ID: 'test-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret',
      AWS_SESSION_TOKEN: 'test-session-token',
      AWS_CREDENTIAL_EXPIRATION: undefined,
      AWS_PROFILE: undefined,
    });
    const module = await Test.createTestingModule({
      imports: [AppModule.forProfile('lambda-web')],
    }).compile();
    app = module.createNestApplication();
    const prisma = app.get(PrismaService);
    const connect = jest.spyOn(prisma, '$connect').mockRejectedValue(new Error('DB not ready'));
    jest.spyOn(prisma, '$queryRaw').mockResolvedValue([{ '?column?': 1 }]);
    configureHttp(app, 'lambda-web');
    await app.init();
    expect(connect).not.toHaveBeenCalled();
  });

  beforeEach(() => {
    fetchIdentity = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json(owner));
    listMemories = jest.spyOn(app.get(MemoriesService), 'listMemories').mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    fetchIdentity.mockRestore();
    listMemories.mockRestore();
  });

  afterAll(async () => {
    environment.restore();
    await app?.close();
  });

  it('checks database health and enforces authorization and validation on public routes', async () => {
    const http = request(app.getHttpServer());
    await http.get('/health').expect(200).expect({ status: 'ok', service: 'memory-service', database: 'ok' });
    await http.get('/v1/memories').expect(401);
    await http.post('/v1/memories').expect(401);
    expect(fetchIdentity).not.toHaveBeenCalled();
    await http
      .post('/v1/memories')
      .set('Authorization', 'Bearer test-token')
      .send({ entryType: 'note', content: 'test', unexpected: true })
      .expect(400);
  });

  it('signs the identity request and scopes listing to the returned IDs', async () => {
    await request(app.getHttpServer())
      .get('/v1/memories')
      .set('Authorization', 'Bearer test-token')
      .set('x-tenant-id', 'client-tenant')
      .set('x-user-id', 'client-user')
      .expect(200, { items: [] });

    expect(fetchIdentity).toHaveBeenCalledTimes(1);
    const [url, init] = fetchIdentity.mock.calls[0]!;
    expect(String(url)).toBe(`${userServiceUrl}/internal/v1/auth/resolve`);
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ idToken: 'test-token' }), redirect: 'error' });
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 /);
    expect(headers.get('x-amz-content-sha256')).toMatch(/^[a-f0-9]{64}$/);
    expect(headers.get('x-tenant-id')).toBeNull();
    expect(headers.get('x-user-id')).toBeNull();
    expect(listMemories).toHaveBeenCalledWith(owner, expect.anything());
  });

  it('rejects invalid identities and fails closed when User Service is unavailable', async () => {
    const http = request(app.getHttpServer());
    const list = () => http.get('/v1/memories').set('Authorization', 'Bearer test-token');
    for (const [upstream, expected] of [
      [401, 401],
      [403, 503],
      [503, 503],
    ]) {
      fetchIdentity.mockResolvedValueOnce(Response.json({ message: 'Private upstream error' }, { status: upstream }));
      const response = await list().expect(expected);
      expect(response.text).not.toContain('Private upstream error');
    }
    fetchIdentity.mockResolvedValueOnce(Response.json({ tenantId: owner.tenantId }));
    await list().expect(503);
    fetchIdentity.mockResolvedValueOnce(Response.json({ ...owner, userId: 'invalid' }));
    await list().expect(503);
    fetchIdentity.mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'));
    await list().expect(503);
    expect(listMemories).not.toHaveBeenCalled();
  });

  it('allows preflight from the configured origin', async () => {
    const preflight = (requestOrigin: string) =>
      request(app.getHttpServer())
        .options('/v1/memories')
        .set('Origin', requestOrigin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'authorization,content-type')
        .expect(204);
    await preflight(origin)
      .expect('Access-Control-Allow-Origin', origin)
      .expect('Access-Control-Allow-Headers', /Authorization.*Content-Type/i);
    expect((await preflight('https://other.example.com')).headers['access-control-allow-origin']).toBeUndefined();
  });

  it('leaves internal routes unregistered in the public application', async () => {
    const http = request(app.getHttpServer());
    for (const path of ['/internal/v1/memories', '/internal/v1/memories/search', '/internal/v1/auth/resolve']) {
      await http.post(path).set('x-tenant-id', 'tenant').set('x-user-id', 'user').expect(404);
    }
  });

  it('serves Swagger UI and documents only the public API', async () => {
    const http = request(app.getHttpServer());
    await http.get('/docs').expect(200).expect('Content-Type', /html/);
    await http.get('/docs/swagger-ui-bundle.js').expect(200);
    const response = await http.get('/docs-json').expect(200).expect('Content-Type', /json/);
    const document = response.body as OpenAPIObject;

    expect(Object.keys(document.paths).sort()).toEqual(['/health', '/v1/memories']);
    expect(document.components?.securitySchemes).toEqual({
      firebase: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    });
    expect(document.paths['/v1/memories']?.get?.security).toEqual([{ firebase: [] }]);
    expect(document.paths['/v1/memories']?.post?.security).toEqual([{ firebase: [] }]);
  });
});

describe('Internal memory HTTP profile', () => {
  it('exposes search and summary writes without a User Service endpoint', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.forProfile('lambda-web-internal')],
    })
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({ lambdaWeb: true }))
      .compile();
    const app = module.createNestApplication();
    configureHttp(app, 'lambda-web-internal');
    await app.init();
    try {
      const http = request(app.getHttpServer());
      await http.post('/internal/v1/auth/resolve').send({ idToken: 'test' }).expect(404);
      await http.post('/internal/v1/memories').send({}).expect(400);
      await http.post('/internal/v1/memories/search').send({ query: 'test' }).expect(400);
      await http.get('/v1/memories').expect(404);
      await http.get('/docs-json').expect(404);
    } finally {
      await app.close();
    }
  });
});

it('requires an HTTPS User Service endpoint for public Lambda Memory', async () => {
  await expect(
    Test.createTestingModule({ imports: [AppModule.forProfile('lambda-web')] })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          lambdaWeb: true,
          awsRegion: 'ap-southeast-2',
          userServiceUrl: 'http://users.example.test',
        }),
      )
      .compile(),
  ).rejects.toThrow('use HTTPS on Lambda');
});
