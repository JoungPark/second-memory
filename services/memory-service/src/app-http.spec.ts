import { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@second-memory/server-db';
import { FirebaseAuthService } from '@second-memory/nest-auth';
import request from 'supertest';
import { AppModule } from './app.module';
import { configureHttp } from './app-http';

describe('Lambda Web HTTP profile', () => {
  const origin = 'https://preview.example.com';
  const previousOrigins = process.env.CORS_ORIGINS;
  let app: INestApplication;

  beforeAll(async () => {
    process.env.CORS_ORIGINS = origin;
    const module = await Test.createTestingModule({
      imports: [AppModule.forProfile('lambda-web')],
    })
      .overrideProvider(FirebaseAuthService)
      .useValue({
        verifyIdToken: jest
          .fn()
          .mockResolvedValue({ tenantId: 'tenant', userId: 'user' }),
      })
      .compile();
    app = module.createNestApplication();
    const prisma = app.get(PrismaService);
    const connect = jest
      .spyOn(prisma, '$connect')
      .mockRejectedValue(new Error('DB not ready'));
    jest.spyOn(prisma, '$queryRaw').mockResolvedValue([{ '?column?': 1 }]);
    configureHttp(app, 'lambda-web');
    await app.init();
    expect(connect).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    if (previousOrigins === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = previousOrigins;
    }
    await app?.close();
  });

  it('checks database health and enforces authorization and validation on public routes', async () => {
    const http = request(app.getHttpServer());
    await http
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', service: 'memory-service', database: 'ok' });
    await http.get('/v1/memories').expect(401);
    await http.post('/v1/memories').expect(401);
    await http
      .post('/v1/memories')
      .set('Authorization', 'Bearer test-token')
      .send({ entryType: 'note', content: 'test', unexpected: true })
      .expect(400);
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
    expect(
      (await preflight('https://other.example.com')).headers[
        'access-control-allow-origin'
      ],
    ).toBeUndefined();
  });

  it('leaves internal routes unregistered in the public application', async () => {
    const http = request(app.getHttpServer());
    for (const path of [
      '/internal/v1/memories',
      '/internal/v1/memories/search',
    ]) {
      await http
        .post(path)
        .set('x-tenant-id', 'tenant')
        .set('x-user-id', 'user')
        .expect(404);
    }
  });

  it('serves Swagger UI and documents only the public API', async () => {
    const http = request(app.getHttpServer());
    await http.get('/docs').expect(200).expect('Content-Type', /html/);
    await http.get('/docs/swagger-ui-bundle.js').expect(200);
    const response = await http
      .get('/docs-json')
      .expect(200)
      .expect('Content-Type', /json/);
    const document = response.body as OpenAPIObject;

    expect(Object.keys(document.paths).sort()).toEqual([
      '/health',
      '/v1/memories',
    ]);
    expect(document.components?.securitySchemes).toEqual({
      firebase: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    });
    expect(document.paths['/v1/memories']?.get?.security).toEqual([
      { firebase: [] },
    ]);
    expect(document.paths['/v1/memories']?.post?.security).toEqual([
      { firebase: [] },
    ]);
  });
});
