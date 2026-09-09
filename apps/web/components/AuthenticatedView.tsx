'use client';

import { useState } from 'react';
import {
  BackendHealthProvider,
  type AppMode,
  useAuth,
} from '@second-memory/ui';
import type { User } from 'firebase/auth';

import { AskScreen } from '@/components/AskScreen';
import { BackendHealthStatus } from '@/components/BackendHealthStatus';
import { ModeSwitch } from '@/components/ModeSwitch';
import { SelfTalkScreen } from '@/components/SelfTalkScreen';
import { SettingsScreen } from '@/components/settings/SettingsScreen';
import { wakeBackendServices } from '@/lib/api/wake-backend';

type AuthenticatedScreen = 'main' | 'settings';

type AuthenticatedViewProps = {
  user: User;
};

export function AuthenticatedView({ user }: AuthenticatedViewProps) {
  const { signOutUser } = useAuth();
  const [screen, setScreen] = useState<AuthenticatedScreen>('main');
  const [mode, setMode] = useState<AppMode>('self-talk');
  const displayName = user.displayName ?? user.email ?? 'User';

  return (
    <BackendHealthProvider checkHealth={wakeBackendServices}>
      {screen === 'settings' ? (
        <SettingsScreen user={user} onBack={() => setScreen('main')} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-zinc-900">{displayName}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setScreen('settings')}
                className="self-start rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 sm:self-auto"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="self-start rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 sm:self-auto"
              >
                Sign out
              </button>
            </div>
          </div>

          <BackendHealthStatus mode={mode} />

          <ModeSwitch mode={mode} onModeChange={setMode} />

          {mode === 'self-talk' ? (
            <SelfTalkScreen mode={mode} />
          ) : (
            <AskScreen mode={mode} />
          )}
        </div>
      )}
    </BackendHealthProvider>
  );
}
