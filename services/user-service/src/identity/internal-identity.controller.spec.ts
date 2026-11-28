import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureHttp } from '../app-http';
import { FirebaseAuthService } from './firebase-auth.service';
import { InternalIdentityController } from './internal-identity.controller';

describe('identity HTTP contract', () => {
  it('validates input, returns IDs, and maps failures', async () => {
    const resolveIdentity = jest.fn().mockResolvedValue({ userId: 'user', tenantId: 'tenant', firebaseUid: 'uid' });
    const module = await Test.createTestingModule({
      controllers: [InternalIdentityController],
      providers: [{ provide: FirebaseAuthService, useValue: { resolveIdentity } }],
    }).compile();
    const app = module.createNestApplication();
    configureHttp(app);
    await app.init();
    try {
      const http = app.getHttpServer();
      await request(http)
        .post('/internal/v1/auth/resolve')
        .send({ idToken: 'token' })
        .expect(200, { userId: 'user', tenantId: 'tenant' });
      for (const body of [
        {},
        { idToken: null },
        { idToken: '' },
        { idToken: 42 },
        { idToken: 'token', userId: 'forged' },
      ]) {
        await request(http).post('/internal/v1/auth/resolve').send(body).expect(400);
      }
      expect(resolveIdentity).toHaveBeenCalledTimes(1);
      resolveIdentity.mockRejectedValueOnce(new UnauthorizedException('Invalid token'));
      await request(http).post('/internal/v1/auth/resolve').send({ idToken: 'bad' }).expect(401);
      resolveIdentity.mockRejectedValueOnce(new Error('private database details'));
      const failure = await request(http).post('/internal/v1/auth/resolve').send({ idToken: 'token' }).expect(503);
      expect(failure.text).not.toContain('private database details');
    } finally {
      await app.close();
    }
  });
});
