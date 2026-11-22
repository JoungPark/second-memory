import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@second-memory/nest-auth';
import { DatabaseModule } from '@second-memory/server-db';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { MemoriesModule } from './memories/memories.module';

export type MemoryAppProfile = 'server' | 'lambda-web' | 'lambda-web-internal';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    AuthModule,
  ],
})
export class AppModule {
  static forProfile(profile: MemoryAppProfile): DynamicModule {
    return {
      module: AppModule,
      imports: [
        profile === 'server'
          ? DatabaseModule
          : DatabaseModule.withLazyConnection(),
        MemoriesModule.forProfile(profile),
        profile === 'lambda-web-internal' ? IdentityModule : HealthModule,
      ],
    };
  }
}
