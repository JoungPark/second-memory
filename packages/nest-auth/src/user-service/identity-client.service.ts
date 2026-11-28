import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ResolveIdentityRequest, ResolveIdentityResponse } from '@second-memory/shared-types';
import { InternalApiClient, InternalApiResponseError } from '../internal-api/internal-api-client';

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value);
}

@Injectable()
export class IdentityClientService {
  private readonly resolveUrl: string;

  constructor(
    config: ConfigService,
    private readonly internalApi: InternalApiClient,
  ) {
    const address = config.get<string>('userServiceUrl');
    const url = address && URL.parse(address);
    if (
      !url ||
      (url.protocol !== 'https:' && (url.protocol !== 'http:' || config.get<boolean>('lambdaWeb'))) ||
      url.username ||
      url.password ||
      /[?#]/.test(url.href)
    ) {
      throw new Error('USER_SERVICE_URL must be a valid HTTP endpoint URL and use HTTPS on Lambda');
    }
    this.resolveUrl = url.href.replace(/\/+$/, '') + '/internal/v1/auth/resolve';
  }

  async resolveIdentity(request: ResolveIdentityRequest): Promise<ResolveIdentityResponse> {
    try {
      const identity = await this.internalApi.post<Partial<ResolveIdentityResponse> | null>(
        this.resolveUrl,
        request,
        8_000,
      );
      if (identity && isUuid(identity.userId) && isUuid(identity.tenantId)) {
        return { userId: identity.userId, tenantId: identity.tenantId };
      }
    } catch (error) {
      if (error instanceof InternalApiResponseError && error.status === 401) {
        throw new UnauthorizedException('Invalid or expired Firebase ID token');
      }
    }
    throw new ServiceUnavailableException('User service unavailable');
  }
}
