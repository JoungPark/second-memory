import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

export interface ResolvedUser {
  tenantId: string;
  userId: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findOrCreateByFirebaseUid(firebaseUid: string, email?: string): ResolvedUser {
    const existing = this.usersRepository.findByFirebaseUid(firebaseUid);
    if (existing) {
      return { tenantId: existing.tenantId, userId: existing.id };
    }

    const created = this.usersRepository.createTenantAndUser(firebaseUid, email);
    return { tenantId: created.tenantId, userId: created.id };
  }
}
