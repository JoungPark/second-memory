import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { RequestContext } from '@second-memory/shared-types';
import { extractBearerToken, readHeader } from '../context/header-utils';
import { AUTHORIZATION_HEADER, REQUEST_CONTEXT_KEY } from '../context/request-context.constants';
import { IdentityClientService } from './identity-client.service';

@Injectable()
export class UserServiceAuthGuard implements CanActivate {
  constructor(private readonly identityClient: IdentityClientService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      [REQUEST_CONTEXT_KEY]?: RequestContext;
    }>();
    const idToken = extractBearerToken(readHeader(request.headers, AUTHORIZATION_HEADER));
    if (!idToken) {
      throw new UnauthorizedException('Missing or invalid Authorization header. Expected: Bearer <Firebase ID token>');
    }
    const { tenantId, userId } = await this.identityClient.resolveIdentity({ idToken });
    request[REQUEST_CONTEXT_KEY] = { tenantId, userId };
    return true;
  }
}
