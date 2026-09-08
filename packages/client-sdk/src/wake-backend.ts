import { checkAskServiceHealth } from './ask-health.js';
import { checkMemoryServiceHealth } from './memory-health.js';
import type { HealthCheckResult } from './types.js';

export async function wakeBackendServices(
  memoryApiBaseUrl: string,
  askApiBaseUrl: string,
): Promise<HealthCheckResult[]> {
  return Promise.all([
    checkMemoryServiceHealth(memoryApiBaseUrl),
    checkAskServiceHealth(askApiBaseUrl),
  ]);
}
