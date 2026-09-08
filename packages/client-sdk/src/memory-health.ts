import { checkServiceHealth } from './health-utils.js';
import type { HealthCheckResult } from './types.js';

export async function checkMemoryServiceHealth(
  memoryApiBaseUrl: string,
): Promise<HealthCheckResult> {
  return checkServiceHealth('memory-service', memoryApiBaseUrl);
}
