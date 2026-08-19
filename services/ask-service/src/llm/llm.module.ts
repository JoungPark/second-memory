import { Module } from '@nestjs/common';
import { OpenAiCompatibleService } from './openai-compatible.service';

@Module({
  providers: [OpenAiCompatibleService],
  exports: [OpenAiCompatibleService],
})
export class LlmModule {}
