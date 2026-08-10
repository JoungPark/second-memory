'use client';

import { MemoryApiClient } from '@second-memory/client-sdk';
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthProvider';

type MemoryApiContextValue = {
  memoryApi: MemoryApiClient;
};

const MemoryApiContext = createContext<MemoryApiContextValue | null>(null);

type MemoryApiProviderProps = {
  baseUrl: string;
  getTenantId?: () => string | Promise<string>;
  children: ReactNode;
};

export function MemoryApiProvider({
  baseUrl,
  getTenantId,
  children,
}: MemoryApiProviderProps) {
  const { getIdToken } = useAuth();

  const memoryApi = useMemo(
    () =>
      new MemoryApiClient({
        baseUrl,
        getIdToken,
        getTenantId,
      }),
    [baseUrl, getIdToken, getTenantId],
  );

  const value = useMemo(() => ({ memoryApi }), [memoryApi]);

  return (
    <MemoryApiContext.Provider value={value}>{children}</MemoryApiContext.Provider>
  );
}

export function useMemoryApi(): MemoryApiClient {
  const context = useContext(MemoryApiContext);

  if (!context) {
    throw new Error('useMemoryApi must be used within a MemoryApiProvider');
  }

  return context.memoryApi;
}
