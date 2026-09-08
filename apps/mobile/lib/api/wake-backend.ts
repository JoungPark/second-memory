import { wakeBackendServices as wakeServices, type HealthCheckResult } from '@second-memory/client-sdk';

import { getAskApiBaseUrl, getMemoryApiBaseUrl } from '@/lib/api/base-url';

export type { HealthCheckResult };

export async function wakeBackendServices(): Promise<HealthCheckResult[]> {
  return wakeServices(getMemoryApiBaseUrl(), getAskApiBaseUrl());
}
