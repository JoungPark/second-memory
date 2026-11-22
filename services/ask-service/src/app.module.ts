import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@second-memory/nest-auth';
import { DatabaseModule } from '@second-memory/server-db';
import { AskModule } from './ask/ask.module';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    HealthModule,
  ],
})
export class AppModule {
  static forProfile(lambdaWeb: boolean): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ...(lambdaWeb
          ? []
          : [ScheduleModule.forRoot(), DatabaseModule, AuthModule]),
        AskModule.forProfile(lambdaWeb),
      ],
    };
  }
}
