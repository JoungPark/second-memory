import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@second-memory/nest-auth';
import { DatabaseModule } from '@second-memory/server-db';
import { AskModule } from './ask/ask.module';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { LlmModule } from './llm/llm.module';
import { MemoryModule } from './memory/memory.module';
import { SessionsModule } from './sessions/sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    HealthModule,
    MemoryModule,
    SessionsModule,
    LlmModule,
    AskModule,
  ],
})
export class AppModule {}
