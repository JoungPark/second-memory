import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IdentityClientService } from '@second-memory/nest-auth';
import request from 'supertest';
import { configureHttp } from '../src/app-http';
import { AppModule } from '../src/app.module';
import { EmbeddingService, EmbeddingUnavailableError } from '../src/embedding/embedding.service';
import { OutboxRelayService } from '../src/queue/outbox-relay.service';
import { createTestAccount, disconnectDatabase, prisma, resetDatabase, testIdentityClient } from './test-database';

afterAll(disconnectDatabase);

describe('MemoryService (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.EMBEDDING_STORAGE_MODE = 'worker';
    await resetDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule.forProfile('server')],
    })
      .overrideProvider(IdentityClientService)
      .useValue(testIdentityClient)
      .overrideProvider(OutboxRelayService)
      .useValue({ relayPendingEvents: jest.fn().mockResolvedValue(0) })
      .compile();

    app = moduleFixture.createNestApplication();
    configureHttp(app, 'server');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.EMBEDDING_STORAGE_MODE;
  });

  it('GET /health returns ok', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({
      status: 'ok',
      service: 'memory-service',
      database: 'ok',
    });
  });

  it('POST /v1/memories creates a memory when auth headers are present', async () => {
    await createTestAccount('firebase-user-1');
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

  it('captures and lists memories under the existing account IDs', async () => {
    const token = 'firebase-existing-account';
    const owner = await createTestAccount(token);
    const previouslyCaptured = await prisma.entry.create({
      data: {
        ...owner,
        entryType: 'note',
        content: 'A note from before the cutover',
        occurredAt: new Date(),
      },
    });

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

    expect(listFirst.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.body.id }),
        expect.objectContaining({ id: previouslyCaptured.id }),
      ]),
    );
    expect(await prisma.entry.findUnique({ where: { id: first.body.id } })).toMatchObject(owner);
  });
});

describe('MemoryService inline storage mode (e2e)', () => {
  let app: INestApplication;
  const inlineVector = Array.from({ length: 1536 }, (_, index) => (index === 0 ? 1 : 0));

  beforeEach(async () => {
    process.env.EMBEDDING_STORAGE_MODE = 'inline';
    await resetDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule.forProfile('lambda-web')],
    })
      .overrideProvider(IdentityClientService)
      .useValue(testIdentityClient)
      .overrideProvider(EmbeddingService)
      .useValue({
        embedText: jest.fn().mockResolvedValue(inlineVector),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureHttp(app, 'lambda-web');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.EMBEDDING_STORAGE_MODE;
  });

  it('stores embeddings directly without writing outbox events', async () => {
    await createTestAccount('firebase-user-inline');
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
    const owner = await createTestAccount('owner');
    const otherAccounts = [
      { token: 'other-tenant', ...(await createTestAccount('other-tenant')) },
      { token: 'same-tenant', ...(await createTestAccount('same-tenant', owner.tenantId)) },
    ];
    const payload = {
      entryType: 'note',
      content: 'One capture',
      idempotencyKey: 'retry-test',
    };
    const capture = () =>
      request(app.getHttpServer()).post('/v1/memories').set('Authorization', 'Bearer owner').send(payload).expect(201);

    const first = await capture();
    const retry = await capture();
    expect(retry.body).toEqual(first.body);
    expect(await prisma.entry.count()).toBe(1);
    for (const { token } of otherAccounts) {
      await request(app.getHttpServer())
        .get('/v1/memories')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', owner.tenantId)
        .set('x-user-id', owner.userId)
        .expect(200, { items: [] });
    }

    const internalModule = await Test.createTestingModule({
      imports: [AppModule.forProfile('lambda-web-internal')],
    })
      .overrideProvider(EmbeddingService)
      .useValue({ embedText: jest.fn().mockResolvedValue(inlineVector) })
      .compile();
    const internalApp = internalModule.createNestApplication();
    configureHttp(internalApp, 'lambda-web-internal');
    await internalApp.init();
    try {
      const search = ({ tenantId, userId }: typeof owner) =>
        request(internalApp.getHttpServer())
          .post('/internal/v1/memories/search')
          .set('x-tenant-id', tenantId)
          .set('x-user-id', userId)
          .send({ query: payload.content })
          .expect(201);
      const ownerResults = await search(owner);
      expect(ownerResults.body.results).toEqual([expect.objectContaining({ id: first.body.id })]);
      for (const account of otherAccounts) {
        expect((await search(account)).body.results).toEqual([]);
      }
    } finally {
      await internalApp.close();
    }
  });

  it('returns 503 without writing an entry when embeddings are unavailable', async () => {
    await createTestAccount('firebase-user-timeout');
    jest
      .mocked(app.get(EmbeddingService).embedText)
      .mockRejectedValueOnce(new EmbeddingUnavailableError('Provider timed out'));

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
