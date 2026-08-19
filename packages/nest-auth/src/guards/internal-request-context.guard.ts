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
import { readHeader } from '../context/header-utils';

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
