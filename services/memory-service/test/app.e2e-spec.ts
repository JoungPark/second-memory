import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { FirebaseAuthService } from '../src/auth/firebase-auth.service';
import { AppModule } from '../src/app.module';
import { REQUEST_CONTEXT_HEADERS } from '../src/common/context/request-context.constants';

describe('MemoryService (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseAuthService)
      .useValue({
        verifyIdToken: jest.fn(async (token: string) => ({
          firebaseUid: token,
          userId: token,
        })),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health returns ok', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({
      status: 'ok',
      service: 'memory-service',
    });
  });

  it('POST /v1/memories creates a memory when auth headers are present', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/memories')
      .set(REQUEST_CONTEXT_HEADERS.tenantId, 'tenant-1')
      .set('Authorization', 'Bearer firebase-user-1')
      .send({
        entryType: 'note',
        content: 'Capture from e2e test',
      })
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.createdAt).toBeDefined();
  });

  it('POST /v1/memories rejects requests without Authorization header', () => {
    return request(app.getHttpServer())
      .post('/v1/memories')
      .set(REQUEST_CONTEXT_HEADERS.tenantId, 'tenant-1')
      .send({
        entryType: 'note',
        content: 'Missing auth token',
      })
      .expect(401);
  });

  it('POST /v1/memories rejects requests without tenant header', () => {
    return request(app.getHttpServer())
      .post('/v1/memories')
      .set('Authorization', 'Bearer firebase-user-1')
      .send({
        entryType: 'note',
        content: 'Missing tenant header',
      })
      .expect(400);
  });
});
