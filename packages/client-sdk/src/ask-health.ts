import { checkServiceHealth } from './health-utils.js';
import type { HealthCheckResult } from './types.js';

export async function checkAskServiceHealth(
  askApiBaseUrl: string,
): Promise<HealthCheckResult> {
  return checkServiceHealth('ask-service', askApiBaseUrl);
}
