import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequestContext } from '@second-memory/shared-types';
import {
  AUTHORIZATION_HEADER,
  REQUEST_CONTEXT_KEY,
} from '../context/request-context.constants';
import { extractBearerToken, readHeader } from '../context/header-utils';
import { FirebaseAuthService } from '../firebase-auth.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseAuthService: FirebaseAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      [REQUEST_CONTEXT_KEY]?: RequestContext;
    }>();

    const idToken = extractBearerToken(
      readHeader(request.headers, AUTHORIZATION_HEADER),
    );
    if (!idToken) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header. Expected: Bearer <Firebase ID token>',
      );
    }

    const verified = await this.firebaseAuthService.verifyIdToken(idToken);

    request[REQUEST_CONTEXT_KEY] = {
      tenantId: verified.tenantId,
      userId: verified.userId,
    };

    return true;
  }
}
