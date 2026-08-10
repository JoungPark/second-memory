import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { REQUEST_CONTEXT_HEADERS } from '../context/request-context.constants';

@Injectable()
export class RequestContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const tenantId = request.headers[REQUEST_CONTEXT_HEADERS.tenantId];
    const userId = request.headers[REQUEST_CONTEXT_HEADERS.userId];

    if (!hasValue(tenantId) || !hasValue(userId)) {
      throw new BadRequestException(
        `Missing required headers: ${REQUEST_CONTEXT_HEADERS.tenantId}, ${REQUEST_CONTEXT_HEADERS.userId}`,
      );
    }

    return true;
  }
}

function hasValue(value: string | string[] | undefined): boolean {
  if (typeof value === 'string') {
    return value.length > 0;
  }

  return Array.isArray(value) && value.length > 0 && value[0].length > 0;
}
