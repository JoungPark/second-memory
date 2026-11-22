import { DynamicModule, Module } from '@nestjs/common';
import { AskAuthGuard } from './ask-auth.guard';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';
import { OpenAiCompatibleService } from '../llm/openai-compatible.service';
import { IdentityClientService } from '../identity/identity-client.service';
import { InternalApiModule } from '../internal-api/internal-api.module';
import { MemoryModule } from '../memory/memory.module';
import { SessionStore } from '../sessions/session-store';
import { SessionStoreService } from '../sessions/session-store.service';
import { ValkeySessionStore } from '../sessions/valkey-session-store';

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
        {
          provide: SessionStore,
          useClass: lambdaWeb ? ValkeySessionStore : SessionStoreService,
        },
      ],
    };
  }
}
