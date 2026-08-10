'use client';

import { AuthProvider as SharedAuthProvider, MemoryApiProvider } from '@second-memory/ui';
import type { ReactNode } from 'react';

import { getFirebaseAuth } from '@/lib/firebase/client';
import { signInWithGoogle } from '@/lib/firebase/sign-in';

const memoryApiBaseUrl =
  process.env.NEXT_PUBLIC_MEMORY_API_URL ?? 'http://localhost:3001';

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SharedAuthProvider getAuth={getFirebaseAuth} signIn={signInWithGoogle}>
      <MemoryApiProvider baseUrl={memoryApiBaseUrl}>{children}</MemoryApiProvider>
    </SharedAuthProvider>
  );
}
