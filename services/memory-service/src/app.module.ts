import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MemoriesModule } from './memories/memories.module';

export type MemoryAppProfile = 'server' | 'lambda-web' | 'lambda-web-internal';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
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
        ...(profile === 'lambda-web-internal' ? [] : [HealthModule]),
      ],
    };
  }
}
