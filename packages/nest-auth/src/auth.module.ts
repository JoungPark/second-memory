import { Global, Module } from '@nestjs/common';
import { UsersModule } from '@second-memory/server-db';
import { FirebaseAuthService } from './firebase-auth.service';

@Global()
@Module({
  imports: [UsersModule],
  providers: [FirebaseAuthService],
  exports: [FirebaseAuthService],
})
export class AuthModule {}
