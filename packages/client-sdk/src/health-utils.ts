import type { HealthCheckResult } from './types.js';

type HealthResponse = {
  status?: string;
  service?: string;
  database?: string;
};

export async function checkServiceHealth(
  service: string,
  baseUrl: string,
): Promise<HealthCheckResult> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const url = `${normalizedBaseUrl}/health`;
  const startedAt = Date.now();

  try {
    const response = await fetch(url);
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        service,
        url,
        ok: false,
        latencyMs,
        error: `HTTP ${response.status}`,
      };
    }

    const body = (await response.json()) as HealthResponse;

    return {
      service,
      url,
      ok: body.status === 'ok',
      latencyMs,
      status: body.status,
      error: body.status === 'ok' ? undefined : `status: ${body.status ?? 'unknown'}`,
    };
  } catch (error) {
    return {
      service,
      url,
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}
