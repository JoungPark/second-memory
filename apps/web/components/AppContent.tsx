'use client';

import { useAuth } from '@second-memory/ui';
import { SharedWelcome } from '@second-memory/ui';

import { AuthenticatedView } from '@/components/AuthenticatedView';
import { LoginButton } from '@/components/auth/LoginButton';

export function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <button
          type="button"
          disabled
          className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500"
        >
          Loading…
        </button>
      </div>
    );
  }

  if (user) {
    return <AuthenticatedView user={user} />;
  }

  return (
    <>
      <SharedWelcome>
        {(message) => <p className="mb-6 text-zinc-700">{message}</p>}
      </SharedWelcome>
      <LoginButton />
    </>
  );
}
