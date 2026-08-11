import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface StoredUser {
  id: string;
  tenantId: string;
  firebaseUid: string;
  email?: string;
  createdAt: string;
}

/**
 * In-memory USER/TENANT store for local development until PostgreSQL integration lands.
 */
@Injectable()
export class UsersRepository {
  private readonly usersByFirebaseUid = new Map<string, StoredUser>();

  findByFirebaseUid(firebaseUid: string): StoredUser | undefined {
    return this.usersByFirebaseUid.get(firebaseUid);
  }

  createTenantAndUser(firebaseUid: string, email?: string): StoredUser {
    const existing = this.usersByFirebaseUid.get(firebaseUid);
    if (existing) {
      return existing;
    }

    const user: StoredUser = {
      id: randomUUID(),
      tenantId: randomUUID(),
      firebaseUid,
      email,
      createdAt: new Date().toISOString(),
    };

    this.usersByFirebaseUid.set(firebaseUid, user);
    return user;
  }
}
