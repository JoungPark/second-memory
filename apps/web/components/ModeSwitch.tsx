'use client';

import type { AppMode } from '@second-memory/ui';

type ModeSwitchProps = {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
};

export function ModeSwitch({ mode, onModeChange }: ModeSwitchProps) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1">
      <button
        type="button"
        onClick={() => onModeChange('self-talk')}
        className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
          mode === 'self-talk'
            ? 'bg-white text-zinc-900 shadow-sm'
            : 'text-zinc-600 hover:text-zinc-900'
        }`}
      >
        Self-talk
      </button>
      <button
        type="button"
        onClick={() => onModeChange('ask')}
        className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
          mode === 'ask'
            ? 'bg-white text-zinc-900 shadow-sm'
            : 'text-zinc-600 hover:text-zinc-900'
        }`}
      >
        Ask
      </button>
    </div>
  );
}
