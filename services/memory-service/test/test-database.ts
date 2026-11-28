import { UnauthorizedException } from '@nestjs/common';
import type { ResolveIdentityRequest } from '@second-memory/shared-types';
import { PrismaClient } from '../prisma/generated';

export const prisma = new PrismaClient();

export async function createTestAccount(firebaseUid: string, tenantId?: string) {
  const user = await prisma.user.create({
    data: {
      firebaseUid,
      tenant: tenantId ? { connect: { id: tenantId } } : { create: {} },
    },
  });
  return { tenantId: user.tenantId, userId: user.id };
}

export const testIdentityClient = {
  async resolveIdentity({ idToken }: ResolveIdentityRequest) {
    const user = await prisma.user.findUnique({ where: { firebaseUid: idToken } });
    if (!user) {
      throw new UnauthorizedException('Unknown test account');
    }
    return { tenantId: user.tenantId, userId: user.id };
  },
};

export async function resetDatabase(): Promise<void> {
  await prisma.entryTag.deleteMany();
  await prisma.entryEmbedding.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
