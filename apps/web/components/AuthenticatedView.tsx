'use client';

import { useState } from 'react';
import type { AppMode } from '@second-memory/ui';
import { useAuth } from '@second-memory/ui';
import type { User } from 'firebase/auth';

import { AskScreen } from '@/components/AskScreen';
import { ModeSwitch } from '@/components/ModeSwitch';
import { SelfTalkScreen } from '@/components/SelfTalkScreen';

type AuthenticatedViewProps = {
  user: User;
};

export function AuthenticatedView({ user }: AuthenticatedViewProps) {
  const { signOutUser } = useAuth();
  const [mode, setMode] = useState<AppMode>('self-talk');
  const displayName = user.displayName ?? user.email ?? 'User';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-zinc-900">{displayName}</p>
        <button
          type="button"
          onClick={() => void signOutUser()}
          className="self-start rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 sm:self-auto"
        >
          Sign out
        </button>
      </div>

      <ModeSwitch mode={mode} onModeChange={setMode} />

      {mode === 'self-talk' ? <SelfTalkScreen /> : <AskScreen />}
    </div>
  );
}
