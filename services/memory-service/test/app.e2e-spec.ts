import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { FirebaseAuthService } from '@second-memory/nest-auth';
import { PrismaClient, UsersService } from '@second-memory/server-db';
import { AppModule } from '../src/app.module';
import {
  EmbeddingService,
  EmbeddingUnavailableError,
} from '../src/embedding/embedding.service';
import { OutboxRelayService } from '../src/queue/outbox-relay.service';
import { disconnectDatabase, resetDatabase } from './test-database';

const prisma = new PrismaClient();

describe('MemoryService (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.EMBEDDING_STORAGE_MODE = 'worker';
    await resetDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule.forProfile('server')],
    })
      .overrideProvider(FirebaseAuthService)
      .useFactory({
        factory: (usersService: UsersService) => ({
          verifyIdToken: jest.fn(async (token: string) => {
            const resolved =
              await usersService.findOrCreateByFirebaseUid(token);
            return {
              firebaseUid: token,
              tenantId: resolved.tenantId,
              userId: resolved.userId,
            };
          }),
        }),
        inject: [UsersService],
      })
      .overrideProvider(OutboxRelayService)
      .useValue({ relayPendingEvents: jest.fn().mockResolvedValue(0) })
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
    delete process.env.EMBEDDING_STORAGE_MODE;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('GET /health returns ok', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({
      status: 'ok',
      service: 'memory-service',
      database: 'ok',
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

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { aggregateId: response.body.id },
    });
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0]?.eventType).toBe('entry.created');
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

describe('MemoryService inline storage mode (e2e)', () => {
  let app: INestApplication;
  const inlineVector = Array.from({ length: 1536 }, (_, index) =>
    index === 0 ? 1 : 0,
  );

  beforeEach(async () => {
    process.env.EMBEDDING_STORAGE_MODE = 'inline';
    await resetDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule.forProfile('lambda-web')],
    })
      .overrideProvider(FirebaseAuthService)
      .useFactory({
        factory: (usersService: UsersService) => ({
          verifyIdToken: jest.fn(async (token: string) => {
            const resolved =
              await usersService.findOrCreateByFirebaseUid(token);
            return {
              firebaseUid: token,
              tenantId: resolved.tenantId,
              userId: resolved.userId,
            };
          }),
        }),
        inject: [UsersService],
      })
      .overrideProvider(EmbeddingService)
      .useValue({
        embedText: jest.fn().mockResolvedValue(inlineVector),
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
    delete process.env.EMBEDDING_STORAGE_MODE;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('stores embeddings directly without writing outbox events', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/memories')
      .set('Authorization', 'Bearer firebase-user-inline')
      .send({
        entryType: 'note',
        content: 'Inline capture from e2e test',
      })
      .expect(201);

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { aggregateId: response.body.id },
    });
    const embedding = await prisma.$queryRaw<Array<{ entry_id: string }>>`
      SELECT entry_id
      FROM entry_embeddings
      WHERE entry_id = ${response.body.id}::uuid
    `;

    expect(outboxEvents).toHaveLength(0);
    expect(embedding).toHaveLength(1);
  });

  it('keeps capture idempotent and isolates entries by account', async () => {
    const payload = {
      entryType: 'note',
      content: 'One capture',
      idempotencyKey: 'retry-test',
    };
    const capture = () =>
      request(app.getHttpServer())
        .post('/v1/memories')
        .set('Authorization', 'Bearer firebase-user-owner')
        .send(payload)
        .expect(201);

    const first = await capture();
    const retry = await capture();
    expect(retry.body).toEqual(first.body);
    expect(await prisma.entry.count()).toBe(1);
    await request(app.getHttpServer())
      .get('/v1/memories')
      .set('Authorization', 'Bearer firebase-user-other')
      .expect(200)
      .expect({ items: [] });
  });

  it('returns 503 without writing an entry when embeddings are unavailable', async () => {
    jest
      .mocked(app.get(EmbeddingService).embedText)
      .mockRejectedValueOnce(
        new EmbeddingUnavailableError('Provider timed out'),
      );

    await request(app.getHttpServer())
      .post('/v1/memories')
      .set('Authorization', 'Bearer firebase-user-timeout')
      .send({ entryType: 'note', content: 'Capture interrupted by timeout' })
      .expect(503);

    expect(await prisma.entry.count()).toBe(0);
    expect(await prisma.entryEmbedding.count()).toBe(0);
    expect(await prisma.outboxEvent.count()).toBe(0);
  });
});
