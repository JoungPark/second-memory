import { randomUUID } from 'node:crypto';
import { IdentityPrismaService } from '../src/identity/postgres/identity-prisma.service';
import { UsersRepository } from '../src/identity/postgres/users.repository';
import { UsersService } from '../src/identity/postgres/users.service';

describe('PostgreSQL identity adapter', () => {
  let prisma: IdentityPrismaService;
  let users: UsersService;
  const fixtureUsers = new Set<string>();
  const fixtureTenants = new Set<string>();

  beforeAll(() => {
    const url = process.env.MEMORY_E2E_DATABASE_URL;
    if (!url) {
      throw new Error('Set MEMORY_E2E_DATABASE_URL to a migrated disposable PostgreSQL database.');
    }
    prisma = new IdentityPrismaService({ datasourceUrl: url });
    users = new UsersService(new UsersRepository(prisma));
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      await prisma.$transaction([
        prisma.user.deleteMany({ where: { firebaseUid: { in: [...fixtureUsers] } } }),
        prisma.tenant.deleteMany({ where: { id: { in: [...fixtureTenants] } } }),
      ]);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('resolves a legacy account to its existing user and tenant IDs', async () => {
    const firebaseUid = randomUUID();
    const tenantId = randomUUID();
    const userId = randomUUID();
    fixtureUsers.add(firebaseUid);
    fixtureTenants.add(tenantId);
    await prisma.user.create({
      data: {
        id: userId,
        firebaseUid,
        email: 'old@example.test',
        tenant: { create: { id: tenantId } },
      },
    });

    await expect(users.findOrCreateByFirebaseUid(firebaseUid, 'new@example.test')).resolves.toEqual({
      tenantId,
      userId,
    });
    await expect(prisma.user.findUnique({ where: { firebaseUid } })).resolves.toMatchObject({
      email: 'old@example.test',
    });
  });

  it('creates only one user and tenant under concurrent first sign-ins', async () => {
    const firebaseUid = randomUUID();
    fixtureUsers.add(firebaseUid);
    const tenantCount = await prisma.tenant.count();

    const results = await Promise.all(Array.from({ length: 8 }, () => users.findOrCreateByFirebaseUid(firebaseUid)));
    for (const { tenantId } of results) fixtureTenants.add(tenantId);

    expect(results).toEqual(Array(8).fill(results[0]));
    expect(await prisma.user.count({ where: { firebaseUid } })).toBe(1);
    expect(await prisma.tenant.count()).toBe(tenantCount + 1);
  });
});
