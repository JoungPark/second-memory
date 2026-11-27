import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@second-memory/server-db';
import { IdentityModule } from './identity/identity.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({ firebase: { projectId: process.env.FIREBASE_PROJECT_ID } })],
    }),
    DatabaseModule.withLazyConnection(),
    IdentityModule,
  ],
})
export class AppModule {}
