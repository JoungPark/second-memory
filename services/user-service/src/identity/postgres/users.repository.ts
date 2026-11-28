import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../prisma/generated';
import { IdentityPrismaService } from './identity-prisma.service';

export interface StoredUser {
  id: string;
  tenantId: string;
  firebaseUid: string;
  email?: string;
  createdAt: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: IdentityPrismaService) {}

  async findByFirebaseUid(firebaseUid: string): Promise<StoredUser | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
    });

    return user ? this.toStoredUser(user) : undefined;
  }

  async createTenantAndUser(firebaseUid: string, email?: string): Promise<StoredUser> {
    const existing = await this.findByFirebaseUid(firebaseUid);
    if (existing) {
      return existing;
    }

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({ data: {} });
        return tx.user.create({
          data: { tenantId: tenant.id, firebaseUid, email },
        });
      });
      return this.toStoredUser(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.findByFirebaseUid(firebaseUid);
        if (winner) {
          return winner;
        }
      }
      throw error;
    }
  }

  private toStoredUser(user: {
    id: string;
    tenantId: string;
    firebaseUid: string;
    email: string | null;
    createdAt: Date;
  }): StoredUser {
    return {
      id: user.id,
      tenantId: user.tenantId,
      firebaseUid: user.firebaseUid,
      email: user.email ?? undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
