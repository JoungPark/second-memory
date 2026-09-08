'use client';

import type { User } from 'firebase/auth';

import { SettingsSection } from '@/components/settings/SettingsSection';
import { WakeBackendSection } from '@/components/settings/WakeBackendSection';

type SettingsScreenProps = {
  user: User;
  onBack: () => void;
};

export function SettingsScreen({ user, onBack }: SettingsScreenProps) {
  const displayName = user.displayName ?? user.email ?? 'User';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm font-semibold text-zinc-600 transition hover:text-zinc-900"
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>
      </div>

      <div className="flex flex-col gap-5">
        <SettingsSection title="Account">
          <p className="text-sm font-medium text-zinc-900">{displayName}</p>
          {user.email ? <p className="mt-0.5 text-sm text-zinc-500">{user.email}</p> : null}
        </SettingsSection>

        <SettingsSection title="Backend">
          <WakeBackendSection />
        </SettingsSection>
      </div>
    </div>
  );
}
