'use client';

import { LoginButton as SharedLoginButton } from '@second-memory/ui';

export function LoginButton() {
  return (
    <SharedLoginButton>
      {({ user, loading, signInWithGoogle, signOutUser }) => {
        if (loading) {
          return (
            <button
              type="button"
              disabled
              className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500"
            >
              Loading…
            </button>
          );
        }

        if (user) {
          return (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-zinc-600">
                Signed in as{' '}
                <span className="font-medium text-zinc-900">
                  {user.displayName ?? user.email ?? 'User'}
                </span>
              </p>
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
              >
                Sign out
              </button>
            </div>
          );
        }

        return (
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Sign in with Google
          </button>
        );
      }}
    </SharedLoginButton>
  );
}
