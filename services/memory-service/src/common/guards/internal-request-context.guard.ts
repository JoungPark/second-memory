import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { RequestContext } from '@second-memory/shared-types';
import {
  REQUEST_CONTEXT_HEADERS,
  REQUEST_CONTEXT_KEY,
} from '../context/request-context.constants';

/**
 * Service-to-service guard for internal routes.
 * Expects tenant and user context propagated by upstream services.
 */
@Injectable()
export class InternalRequestContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      [REQUEST_CONTEXT_KEY]?: RequestContext;
    }>();

    const tenantId = readHeader(request.headers, REQUEST_CONTEXT_HEADERS.tenantId);
    const userId = readHeader(request.headers, REQUEST_CONTEXT_HEADERS.userId);

    if (!tenantId || !userId) {
      throw new BadRequestException(
        `Missing required headers: ${REQUEST_CONTEXT_HEADERS.tenantId}, ${REQUEST_CONTEXT_HEADERS.userId}`,
      );
    }

    request[REQUEST_CONTEXT_KEY] = { tenantId, userId };
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
