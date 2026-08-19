import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

export interface ResolvedUser {
  tenantId: string;
  userId: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findOrCreateByFirebaseUid(
    firebaseUid: string,
    email?: string,
  ): Promise<ResolvedUser> {
    const existing = await this.usersRepository.findByFirebaseUid(firebaseUid);
    if (existing) {
      return { tenantId: existing.tenantId, userId: existing.id };
    }

    const created = await this.usersRepository.createTenantAndUser(firebaseUid, email);
    return { tenantId: created.tenantId, userId: created.id };
  }
}
