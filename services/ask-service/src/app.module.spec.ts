import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

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
