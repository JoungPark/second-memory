import { Body, Controller, HttpCode, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthService } from '@second-memory/nest-auth';
import type { ResolveIdentityRequest, ResolveIdentityResponse } from '@second-memory/shared-types';
import { IsNotEmpty, IsString } from 'class-validator';

class ResolveIdentityDto implements ResolveIdentityRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

class ResolvedIdentityDto implements ResolveIdentityResponse {
  @ApiProperty({ format: 'uuid' })
  tenantId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;
}

@ApiTags('internal')
@Controller('internal/v1/auth')
export class InternalIdentityController {
  constructor(private readonly auth: FirebaseAuthService) {}

  @Post('resolve')
  @HttpCode(200)
  @ApiOkResponse({ type: ResolvedIdentityDto })
  async resolve(@Body() body: ResolveIdentityDto): Promise<ResolveIdentityResponse> {
    try {
      const { tenantId, userId } = await this.auth.resolveIdentity(body.idToken);
      return { tenantId, userId };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new ServiceUnavailableException('Identity resolution unavailable');
    }
  }
}
