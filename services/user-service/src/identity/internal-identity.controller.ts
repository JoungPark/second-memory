import { Body, Controller, HttpCode, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { FirebaseAuthService } from '@second-memory/nest-auth';
import type { ResolveIdentityRequest, ResolveIdentityResponse } from '@second-memory/shared-types';
import { IsNotEmpty, IsString } from 'class-validator';

class ResolveIdentityDto implements ResolveIdentityRequest {
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

@Controller('internal/v1/auth')
export class InternalIdentityController {
  constructor(private readonly auth: FirebaseAuthService) {}

  @Post('resolve')
  @HttpCode(200)
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
