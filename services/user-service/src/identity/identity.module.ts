import { Module } from '@nestjs/common';
import { FirebaseAuthService } from './firebase-auth.service';
import { InternalIdentityController } from './internal-identity.controller';
import { IdentityPrismaService } from './postgres/identity-prisma.service';
import { UsersRepository } from './postgres/users.repository';
import { UsersService } from './postgres/users.service';

@Module({
  controllers: [InternalIdentityController],
  providers: [FirebaseAuthService, IdentityPrismaService, UsersRepository, UsersService],
})
export class IdentityModule {}
