'use client';

import { AskApiClient } from '@second-memory/client-sdk';
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthProvider';

type AskApiContextValue = {
  askApi: AskApiClient;
};

const AskApiContext = createContext<AskApiContextValue | null>(null);

type AskApiProviderProps = {
  baseUrl: string;
  children: ReactNode;
};

export function AskApiProvider({ baseUrl, children }: AskApiProviderProps) {
  const { getIdToken } = useAuth();

  const askApi = useMemo(
    () =>
      new AskApiClient({
        baseUrl,
        getIdToken,
      }),
    [baseUrl, getIdToken],
  );

  const value = useMemo(() => ({ askApi }), [askApi]);

  return (
    <AskApiContext.Provider value={value}>{children}</AskApiContext.Provider>
  );
}

export function useAskApi(): AskApiClient {
  const context = useContext(AskApiContext);

  if (!context) {
    throw new Error('useAskApi must be used within an AskApiProvider');
  }

  return context.askApi;
}
