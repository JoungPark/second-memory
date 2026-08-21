'use client';

import {
  AskApiProvider,
  AuthProvider as SharedAuthProvider,
  MemoryApiProvider,
} from '@second-memory/ui';
import type { ReactNode } from 'react';

import { getFirebaseAuth } from '@/lib/firebase/client';
import { signInWithGoogle } from '@/lib/firebase/sign-in';

const memoryApiBaseUrl =
  process.env.NEXT_PUBLIC_MEMORY_API_URL ?? 'http://localhost:3001';
const askApiBaseUrl =
  process.env.NEXT_PUBLIC_ASK_API_URL ?? 'http://localhost:3002';

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SharedAuthProvider getAuth={getFirebaseAuth} signIn={signInWithGoogle}>
      <MemoryApiProvider baseUrl={memoryApiBaseUrl}>
        <AskApiProvider baseUrl={askApiBaseUrl}>{children}</AskApiProvider>
      </MemoryApiProvider>
    </SharedAuthProvider>
  );
}
