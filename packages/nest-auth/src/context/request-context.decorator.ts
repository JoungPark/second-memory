import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestContext } from '@second-memory/shared-types';
import { REQUEST_CONTEXT_KEY } from './request-context.constants';

export const ReqContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest<{
      [REQUEST_CONTEXT_KEY]?: RequestContext;
    }>();

    const context = request[REQUEST_CONTEXT_KEY];

    if (!context) {
      throw new Error('Request context is missing. Ensure an auth guard ran first.');
    }

    return context;
  },
);
