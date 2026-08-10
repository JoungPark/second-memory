import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { REQUEST_CONTEXT_HEADERS } from '../src/common/context/request-context.constants';

describe('MemoryService (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  it('POST /v1/memories creates a memory when context headers are present', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/memories')
      .set(REQUEST_CONTEXT_HEADERS.tenantId, 'tenant-1')
      .set(REQUEST_CONTEXT_HEADERS.userId, 'user-1')
      .send({
        entryType: 'note',
        content: 'Capture from e2e test',
      })
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.createdAt).toBeDefined();
  });

  it('POST /v1/memories rejects requests without context headers', () => {
    return request(app.getHttpServer())
      .post('/v1/memories')
      .send({
        entryType: 'note',
        content: 'Missing headers',
      })
      .expect(400);
  });
});
