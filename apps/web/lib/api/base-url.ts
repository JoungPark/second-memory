export function getMemoryApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_MEMORY_API_URL ?? 'http://localhost:3001';
}

export function getAskApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_ASK_API_URL ?? 'http://localhost:3002';
}
