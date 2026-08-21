'use client';

import { AuthProvider as SharedAuthProvider } from '@second-memory/ui';
import type { ReactNode } from 'react';

import { getFirebaseAuth } from '@/lib/firebase/client';
import { signInWithGoogle } from '@/lib/firebase/sign-in';

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SharedAuthProvider getAuth={getFirebaseAuth} signIn={signInWithGoogle}>
      {children}
    </SharedAuthProvider>
  );
}
