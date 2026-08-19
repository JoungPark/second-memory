import { Module } from '@nestjs/common';
import { FirebaseAuthGuard } from '@second-memory/nest-auth';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';
import { OpenAiCompatibleService } from '../llm/openai-compatible.service';
import { MemoryClientService } from '../memory/memory-client.service';
import { SessionStoreService } from '../sessions/session-store.service';

@Module({
  controllers: [AskController],
  providers: [
    AskService,
    FirebaseAuthGuard,
    MemoryClientService,
    SessionStoreService,
    OpenAiCompatibleService,
  ],
})
export class AskModule {}
