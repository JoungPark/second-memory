import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { MemoriesModule } from './memories/memories.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    HealthModule,
    MemoriesModule,
  ],
})
export class AppModule {}
