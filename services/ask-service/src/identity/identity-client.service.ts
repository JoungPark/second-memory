import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ResolveIdentityRequest, ResolveIdentityResponse } from '@second-memory/shared-types';
import { InternalApiClient, InternalApiResponseError } from '../internal-api/internal-api-client';

@Injectable()
export class IdentityClientService {
  private readonly baseUrl: string;

  constructor(
    config: ConfigService,
    private readonly internalApi: InternalApiClient,
  ) {
    this.baseUrl = config.get<string>('memoryServiceUrl', 'http://localhost:3001').replace(/\/$/, '');
  }

  async resolveIdentity(request: ResolveIdentityRequest): Promise<ResolveIdentityResponse> {
    try {
      return await this.internalApi.post(`${this.baseUrl}/internal/v1/auth/resolve`, request, 8_000);
    } catch (error) {
      if (error instanceof InternalApiResponseError && error.status === 401) {
        throw new UnauthorizedException('Invalid or expired Firebase ID token');
      }
      throw new ServiceUnavailableException('Memory service unavailable');
    }
  }
}
