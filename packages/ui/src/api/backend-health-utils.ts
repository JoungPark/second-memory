import type { HealthCheckResult } from '@second-memory/client-sdk';

import type { AppMode } from '../AppMode';

export type BackendHealthStatus = 'checking' | 'healthy' | 'unhealthy';

export function getRequiredService(
  mode: AppMode,
): 'memory-service' | 'ask-service' {
  return mode === 'self-talk' ? 'memory-service' : 'ask-service';
}

export function isServiceHealthy(
  results: HealthCheckResult[],
  service: string,
): boolean {
  return results.find((result) => result.service === service)?.ok ?? false;
}

export function deriveStatus(
  results: HealthCheckResult[],
): 'healthy' | 'unhealthy' {
  const allHealthy = results.length > 0 && results.every((result) => result.ok);
  return allHealthy ? 'healthy' : 'unhealthy';
}

export function canSendForMode(
  status: BackendHealthStatus,
  mode: AppMode,
  results: HealthCheckResult[],
): boolean {
  if (status === 'checking') {
    return false;
  }

  return isServiceHealthy(results, getRequiredService(mode));
}
