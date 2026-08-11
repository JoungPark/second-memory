import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequestContext } from '@second-memory/shared-types';
import { FirebaseAuthService } from '../../auth/firebase-auth.service';
import {
  AUTHORIZATION_HEADER,
  REQUEST_CONTEXT_KEY,
} from '../context/request-context.constants';

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

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string {
  const value = headers[name];

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (Array.isArray(value) && value[0]) {
    return value[0];
  }

  return '';
}

function extractBearerToken(authorizationHeader: string): string | null {
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}
