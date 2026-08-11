import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function resetDatabase(): Promise<void> {
  await prisma.entryTag.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
