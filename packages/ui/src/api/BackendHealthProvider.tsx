'use client';

import type { HealthCheckResult } from '@second-memory/client-sdk';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { AppMode } from '../AppMode';
import {
  canSendForMode,
  deriveStatus,
  type BackendHealthStatus,
} from './backend-health-utils';

const DEFAULT_POLL_INTERVAL_MS = 10 * 60 * 1000;

type BackendHealthContextValue = {
  status: BackendHealthStatus;
  results: HealthCheckResult[];
  canSend: (mode: AppMode) => boolean;
  refresh: () => Promise<void>;
};

const BackendHealthContext = createContext<BackendHealthContextValue | null>(
  null,
);

type BackendHealthProviderProps = {
  checkHealth: () => Promise<HealthCheckResult[]>;
  pollIntervalMs?: number;
  children: ReactNode;
};

export function BackendHealthProvider({
  checkHealth,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  children,
}: BackendHealthProviderProps) {
  const [status, setStatus] = useState<BackendHealthStatus>('checking');
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const checkingRef = useRef(false);

  const runCheck = useCallback(async () => {
    if (checkingRef.current) {
      return;
    }

    checkingRef.current = true;
    setStatus('checking');

    try {
      const healthResults = await checkHealth();
      setResults(healthResults);
      setStatus(deriveStatus(healthResults));
    } catch {
      setResults([]);
      setStatus('unhealthy');
    } finally {
      checkingRef.current = false;
    }
  }, [checkHealth]);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      void runCheck();
    }, pollIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [pollIntervalMs, runCheck]);

  const canSend = useCallback(
    (mode: AppMode) => canSendForMode(status, mode, results),
    [results, status],
  );

  const value = useMemo(
    () => ({
      status,
      results,
      canSend,
      refresh: runCheck,
    }),
    [canSend, results, runCheck, status],
  );

  return (
    <BackendHealthContext.Provider value={value}>
      {children}
    </BackendHealthContext.Provider>
  );
}

export function useBackendHealth(): BackendHealthContextValue {
  const context = useContext(BackendHealthContext);

  if (!context) {
    throw new Error('useBackendHealth must be used within BackendHealthProvider');
  }

  return context;
}
