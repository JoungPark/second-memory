import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamicModule, Module } from '@nestjs/common';
import { AskAuthGuard } from './ask-auth.guard';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';
import { OpenAiCompatibleService } from '../llm/openai-compatible.service';
import { IdentityClientService } from '../identity/identity-client.service';
import { InternalApiModule } from '../internal-api/internal-api.module';
import { MemoryModule } from '../memory/memory.module';
import { DynamoDbSessionStore } from '../sessions/dynamodb-session-store';
import { SessionStore } from '../sessions/session-store';
import { SessionStoreService } from '../sessions/session-store.service';

@Module({
  imports: [InternalApiModule, MemoryModule],
  controllers: [AskController],
  providers: [AskService, AskAuthGuard, IdentityClientService, OpenAiCompatibleService],
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
