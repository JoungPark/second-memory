import { Injectable, Optional, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import {
  AUTHORIZATION_HEADER,
  FirebaseAuthService,
  REQUEST_CONTEXT_KEY,
  extractBearerToken,
  readHeader,
} from '@second-memory/nest-auth';
import type { RequestContext } from '@second-memory/shared-types';
import { IdentityClientService } from '../identity/identity-client.service';

@Injectable()
export class AskAuthGuard implements CanActivate {
  constructor(
    private readonly identityClient: IdentityClientService,
    @Optional() private readonly localAuth?: FirebaseAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      [REQUEST_CONTEXT_KEY]?: RequestContext;
    }>();
    const idToken = extractBearerToken(readHeader(request.headers, AUTHORIZATION_HEADER));
    if (!idToken) {
      throw new UnauthorizedException('Missing or invalid Authorization header. Expected: Bearer <Firebase ID token>');
    }
    const { tenantId, userId } = this.localAuth
      ? await this.localAuth.verifyIdToken(idToken)
      : await this.identityClient.resolveIdentity({ idToken });
    request[REQUEST_CONTEXT_KEY] = { tenantId, userId };
    return true;
  }
}
