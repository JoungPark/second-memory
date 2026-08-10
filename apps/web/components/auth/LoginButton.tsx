'use client';

import { LoginButton as SharedLoginButton } from '@second-memory/ui';

export function LoginButton() {
  return (
    <SharedLoginButton>
      {({ loading, signInWithGoogle }) => {
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
