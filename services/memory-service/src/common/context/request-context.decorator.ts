import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestContext } from '@second-memory/shared-types';
import { REQUEST_CONTEXT_HEADERS } from './request-context.constants';

export const ReqContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const tenantId = readHeader(request.headers, REQUEST_CONTEXT_HEADERS.tenantId);
    const userId = readHeader(request.headers, REQUEST_CONTEXT_HEADERS.userId);

    return { tenantId, userId };
  },
);

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
