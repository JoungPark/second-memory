import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { RequestContext } from '@second-memory/shared-types';
import { FirebaseAuthGuard, ReqContext } from '@second-memory/nest-auth';
import { AskService } from './ask.service';
import { AskMessageDto } from './dto/ask.dto';

@Controller('v1/ask')
@UseGuards(FirebaseAuthGuard)
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post('messages')
  sendMessage(@ReqContext() context: RequestContext, @Body() body: AskMessageDto) {
    return this.askService.sendMessage(context, body);
  }
}
