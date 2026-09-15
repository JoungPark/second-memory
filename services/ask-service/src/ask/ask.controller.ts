import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '@second-memory/shared-types';
import { FirebaseAuthGuard, ReqContext } from '@second-memory/nest-auth';
import { AskService } from './ask.service';
import { AskCloseDto, AskEndDto, AskMessageDto } from './dto/ask.dto';

@ApiTags('ask')
@ApiBearerAuth('firebase')
@Controller('v1/ask')
@UseGuards(FirebaseAuthGuard)
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Send ask message' })
  sendMessage(@ReqContext() context: RequestContext, @Body() body: AskMessageDto) {
    return this.askService.sendMessage(context, body);
  }

  @Post('end')
  @ApiOperation({ summary: 'End ask session' })
  endSession(@ReqContext() context: RequestContext, @Body() body: AskEndDto) {
    return this.askService.endSession(context, body);
  }

  @Post('close')
  @ApiOperation({ summary: 'Close ask session' })
  closeSession(@ReqContext() context: RequestContext, @Body() body: AskCloseDto) {
    return this.askService.closeSession(context, body);
  }
}
