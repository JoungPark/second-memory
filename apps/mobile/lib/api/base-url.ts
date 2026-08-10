import { Platform } from 'react-native';

/**
 * Resolves a local dev API base URL for the current platform.
 *
 * 1. Uses envValue when set, otherwise defaultUrl
 * 2. On Android emulator, rewrites localhost/127.0.0.1 to 10.0.2.2
 *    (the emulator alias for the host machine)
 *
 * Use the same helper for other services by passing a different env var
 * and default port, e.g. resolveDevApiUrl(process.env.EXPO_PUBLIC_ASK_API_URL, 'http://localhost:3002')
 *
 * For a physical Android device, set the env var to your machine's LAN IP
 * instead of localhost, e.g. http://192.168.1.42:3001
 */
export function resolveDevApiUrl(
  envValue: string | undefined,
  defaultUrl: string,
): string {
  const url = envValue?.trim() || defaultUrl;

  if (Platform.OS !== 'android') {
    return url;
  }

  return url.replace(/localhost|127\.0\.0\.1/g, '10.0.2.2');
}

export function getMemoryApiBaseUrl(): string {
  return resolveDevApiUrl(
    process.env.EXPO_PUBLIC_MEMORY_API_URL,
    'http://localhost:3001',
  );
}
