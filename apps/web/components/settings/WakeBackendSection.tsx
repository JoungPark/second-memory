'use client';

import { useBackendHealth } from '@second-memory/ui';

import { getAskApiBaseUrl, getMemoryApiBaseUrl } from '@/lib/api/base-url';

export function WakeBackendSection() {
  const { status, results, refresh } = useBackendHealth();
  const waking = status === 'checking';

  return (
    <div className="flex flex-col gap-1.5">
      <p className="mb-1 text-sm text-zinc-500">
        Ping backend services to wake them from sleep before using the app.
      </p>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Memory API
      </p>
      <p className="font-mono text-xs text-zinc-700">{getMemoryApiBaseUrl()}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Ask API
      </p>
      <p className="font-mono text-xs text-zinc-700">{getAskApiBaseUrl()}</p>

      <button
        type="button"
        disabled={waking}
        onClick={() => void refresh()}
        className="mt-2 self-start rounded-lg bg-zinc-700 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-70"
      >
        {waking ? 'Waking…' : 'Wake backend'}
      </button>

      {results.length > 0 ? (
        <div className="mt-1 flex flex-col gap-1">
          {results.map((result) => (
            <p
              key={result.service}
              className={`text-xs ${result.ok ? 'text-green-600' : 'text-red-600'}`}
            >
              {result.service}: {result.ok ? 'ok' : 'failed'} ({result.latencyMs}ms)
              {result.error ? ` — ${result.error}` : ''}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
