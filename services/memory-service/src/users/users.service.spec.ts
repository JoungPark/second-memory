import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, UsersRepository],
    }).compile();

    service = module.get(UsersService);
  });

  it('creates a tenant and user on first login', () => {
    const resolved = service.findOrCreateByFirebaseUid('firebase-uid-1', 'user@example.com');

    expect(resolved.tenantId).toBeDefined();
    expect(resolved.userId).toBeDefined();
  });

  it('returns the same tenant and user ids for the same firebase uid', () => {
    const first = service.findOrCreateByFirebaseUid('firebase-uid-2');
    const second = service.findOrCreateByFirebaseUid('firebase-uid-2');

    expect(second.tenantId).toBe(first.tenantId);
    expect(second.userId).toBe(first.userId);
  });

  it('provisions separate tenant and user ids for different firebase uids', () => {
    const first = service.findOrCreateByFirebaseUid('firebase-uid-a');
    const second = service.findOrCreateByFirebaseUid('firebase-uid-b');

    expect(second.tenantId).not.toBe(first.tenantId);
    expect(second.userId).not.toBe(first.userId);
  });
});
