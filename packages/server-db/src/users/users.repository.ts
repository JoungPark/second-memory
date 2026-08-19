import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface StoredUser {
  id: string;
  tenantId: string;
  firebaseUid: string;
  email?: string;
  createdAt: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

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

    const user = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {},
      });

      return tx.user.create({
        data: {
          tenantId: tenant.id,
          firebaseUid,
          email,
        },
      });
    });

    return this.toStoredUser(user);
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
