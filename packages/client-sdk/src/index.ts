export { AskApiClient, type AskApiClientOptions } from './ask-api-client.js';
export { checkAskServiceHealth } from './ask-health.js';
export { MemoryApiClient, type MemoryApiClientOptions } from './memory-api-client.js';
export { checkMemoryServiceHealth } from './memory-health.js';
export type { GetIdToken, HealthCheckResult } from './types.js';
export { wakeBackendServices } from './wake-backend.js';

export type { MemoryRecord } from '@second-memory/shared-types';

export interface ListMemoriesResponseLegacy {
  memories: import('@second-memory/shared-types').MemoryRecord[];
}
