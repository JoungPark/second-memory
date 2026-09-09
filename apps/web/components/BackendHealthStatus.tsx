'use client';

import {
  getRequiredService,
  isServiceHealthy,
  type AppMode,
  useBackendHealth,
} from '@second-memory/ui';

type BackendHealthStatusProps = {
  mode: AppMode;
};

export function BackendHealthStatus({ mode }: BackendHealthStatusProps) {
  const { status, results, refresh } = useBackendHealth();

  if (status === 'healthy') {
    return null;
  }

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <span
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600"
          aria-hidden="true"
        />
        <p className="text-sm text-zinc-500">Checking backend…</p>
      </div>
    );
  }

  const requiredService = getRequiredService(mode);
  const serviceHealthy = isServiceHealthy(results, requiredService);
  const failedResult = results.find((result) => result.service === requiredService);

  if (serviceHealthy) {
    return null;
  }

  const serviceLabel =
    requiredService === 'memory-service' ? 'Memory service' : 'Ask service';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
      <p className="flex-1 text-sm text-red-600">
        {serviceLabel} unavailable
        {failedResult?.error ? ` — ${failedResult.error}` : ''}
      </p>
      <button
        type="button"
        onClick={() => void refresh()}
        className="rounded-md border border-red-600 px-2.5 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
      >
        Retry
      </button>
    </div>
  );
}
