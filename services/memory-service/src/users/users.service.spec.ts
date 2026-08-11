import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    repository = {
      findByFirebaseUid: jest.fn(),
      createTenantAndUser: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('creates a tenant and user on first login', async () => {
    repository.findByFirebaseUid.mockResolvedValue(undefined);
    repository.createTenantAndUser.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      firebaseUid: 'firebase-uid-1',
      email: 'user@example.com',
      createdAt: '2026-08-11T00:00:00.000Z',
    });

    const resolved = await service.findOrCreateByFirebaseUid(
      'firebase-uid-1',
      'user@example.com',
    );

    expect(resolved.tenantId).toBe('tenant-1');
    expect(resolved.userId).toBe('user-1');
  });

  it('returns the same tenant and user ids for the same firebase uid', async () => {
    repository.findByFirebaseUid.mockResolvedValue({
      id: 'user-2',
      tenantId: 'tenant-2',
      firebaseUid: 'firebase-uid-2',
      createdAt: '2026-08-11T00:00:00.000Z',
    });

    const first = await service.findOrCreateByFirebaseUid('firebase-uid-2');
    const second = await service.findOrCreateByFirebaseUid('firebase-uid-2');

    expect(second.tenantId).toBe(first.tenantId);
    expect(second.userId).toBe(first.userId);
    expect(repository.createTenantAndUser).not.toHaveBeenCalled();
  });

  it('provisions separate tenant and user ids for different firebase uids', async () => {
    repository.findByFirebaseUid.mockResolvedValue(undefined);
    repository.createTenantAndUser
      .mockResolvedValueOnce({
        id: 'user-a',
        tenantId: 'tenant-a',
        firebaseUid: 'firebase-uid-a',
        createdAt: '2026-08-11T00:00:00.000Z',
      })
      .mockResolvedValueOnce({
        id: 'user-b',
        tenantId: 'tenant-b',
        firebaseUid: 'firebase-uid-b',
        createdAt: '2026-08-11T00:00:00.000Z',
      });

    const first = await service.findOrCreateByFirebaseUid('firebase-uid-a');
    const second = await service.findOrCreateByFirebaseUid('firebase-uid-b');

    expect(second.tenantId).not.toBe(first.tenantId);
    expect(second.userId).not.toBe(first.userId);
  });
});
