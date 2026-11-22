import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLambdaRequestSigner } from './aws-request-signer';

export class InternalApiResponseError extends Error {
  constructor(readonly status: number) {
    super(`Internal API responded with HTTP ${status}`);
  }
}

@Injectable()
export class InternalApiClient {
  private readonly signer?: ReturnType<typeof createLambdaRequestSigner>;

  constructor(config: ConfigService) {
    if (config.get<boolean>('lambdaWeb')) {
      this.signer = createLambdaRequestSigner(config.getOrThrow<string>('awsRegion'));
    }
  }

  async post<T>(
    address: string,
    request: object,
    timeoutMs: number,
    requestHeaders: Record<string, string> = {},
  ): Promise<T> {
    const url = new URL(address);
    const body = JSON.stringify(request);
    const headers = { 'content-type': 'application/json', ...requestHeaders };
    const signed = this.signer
      ? await this.signer.sign({
          method: 'POST',
          protocol: url.protocol,
          hostname: url.hostname,
          path: url.pathname,
          body,
          headers: { ...headers, host: url.host },
        })
      : undefined;
    const response = await fetch(url, {
      method: 'POST',
      headers: signed?.headers ?? headers,
      body,
      ...(signed ? { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' as const } : {}),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new InternalApiResponseError(response.status);
    }
    return (await response.json()) as T;
  }
}
