import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { FirebaseAuthService } from '../src/auth/firebase-auth.service';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';

describe('MemoryService (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseAuthService)
      .useFactory({
        factory: (usersService: UsersService) => ({
          verifyIdToken: jest.fn(async (token: string) => {
            const resolved = usersService.findOrCreateByFirebaseUid(token);
            return {
              firebaseUid: token,
              tenantId: resolved.tenantId,
              userId: resolved.userId,
            };
          }),
        }),
        inject: [UsersService],
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
      .send({
        entryType: 'note',
        content: 'Missing auth token',
      })
      .expect(401);
  });

  it('provisions user on first authenticated request', async () => {
    const token = 'firebase-user-provision';

    const first = await request(app.getHttpServer())
      .post('/v1/memories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        entryType: 'note',
        content: 'First request',
      })
      .expect(201);

    const listFirst = await request(app.getHttpServer())
      .get('/v1/memories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listFirst.body.items).toHaveLength(1);
    expect(listFirst.body.items[0]?.id).toBe(first.body.id);

    await request(app.getHttpServer())
      .post('/v1/memories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        entryType: 'note',
        content: 'Second request',
      })
      .expect(201);

    const listSecond = await request(app.getHttpServer())
      .get('/v1/memories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listSecond.body.items).toHaveLength(2);
  });
});
