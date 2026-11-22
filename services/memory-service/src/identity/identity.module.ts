import { Module } from '@nestjs/common';
import { AuthModule } from '@second-memory/nest-auth';
import { InternalIdentityController } from './internal-identity.controller';

@Module({
  imports: [AuthModule],
  controllers: [InternalIdentityController],
})
export class IdentityModule {}
