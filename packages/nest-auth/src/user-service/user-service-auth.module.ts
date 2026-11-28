import { Module } from '@nestjs/common';
import { InternalApiModule } from '../internal-api/internal-api.module';
import { IdentityClientService } from './identity-client.service';
import { UserServiceAuthGuard } from './user-service-auth.guard';

@Module({
  imports: [InternalApiModule],
  providers: [IdentityClientService, UserServiceAuthGuard],
  exports: [IdentityClientService, UserServiceAuthGuard],
})
export class UserServiceAuthModule {}
