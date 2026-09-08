import type { GetIdToken } from './types.js';

export type ApiServiceLabel = 'Memory API' | 'Ask API';

export async function authenticatedRequest(
  baseUrl: string,
  getIdToken: GetIdToken,
  path: string,
  init: RequestInit,
  serviceLabel: ApiServiceLabel,
): Promise<Response> {
  const token = await getIdToken();

  if (!token) {
    throw new Error('Not authenticated. Sign in to obtain a Firebase ID token.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `${serviceLabel} request failed (${response.status} ${response.statusText}): ${message}`,
    );
  }

  return response;
}
