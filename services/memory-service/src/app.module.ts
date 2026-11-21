import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@second-memory/nest-auth';
import { DatabaseModule } from '@second-memory/server-db';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { MemoriesModule } from './memories/memories.module';

export type MemoryAppProfile = 'server' | 'lambda-web';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {
  static forProfile(profile: MemoryAppProfile): DynamicModule {
    return {
      module: AppModule,
      imports:
        profile === 'lambda-web'
          ? [DatabaseModule.withLazyConnection(), MemoriesModule]
          : [DatabaseModule, MemoriesModule.withInternalRoutes()],
    };
  }
}
