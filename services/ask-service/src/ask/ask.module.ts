import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamicModule, Module } from '@nestjs/common';
import { UserServiceAuthModule } from '@second-memory/nest-auth';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';
import { OpenAiCompatibleService } from '../llm/openai-compatible.service';
import { MemoryModule } from '../memory/memory.module';
import { DynamoDbSessionStore } from '../sessions/dynamodb-session-store';
import { SessionStore } from '../sessions/session-store';
import { SessionStoreService } from '../sessions/session-store.service';

@Module({
  imports: [UserServiceAuthModule, MemoryModule],
  controllers: [AskController],
  providers: [AskService, OpenAiCompatibleService],
})
export class AskModule {
  static forProfile(lambdaWeb: boolean): DynamicModule {
    return {
      module: AskModule,
      providers: [
        ...(lambdaWeb ? [{ provide: DynamoDBClient, useFactory: () => new DynamoDBClient({ maxAttempts: 1 }) }] : []),
        {
          provide: SessionStore,
          useClass: lambdaWeb ? DynamoDbSessionStore : SessionStoreService,
        },
      ],
    };
  }
}
