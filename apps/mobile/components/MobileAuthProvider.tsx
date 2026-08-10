import { AuthProvider as SharedAuthProvider, MemoryApiProvider } from '@second-memory/ui';
import { useEffect, type ReactNode } from 'react';

import { getFirebaseAuth } from '@/lib/firebase/client';
import {
  configureGoogleSignIn,
  signInWithGoogle,
} from '@/lib/firebase/sign-in';

const memoryApiBaseUrl =
  process.env.EXPO_PUBLIC_MEMORY_API_URL ?? 'http://localhost:3001';

type MobileAuthProviderProps = {
  children: ReactNode;
};

export function MobileAuthProvider({ children }: MobileAuthProviderProps) {
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  return (
    <SharedAuthProvider getAuth={getFirebaseAuth} signIn={signInWithGoogle}>
      <MemoryApiProvider baseUrl={memoryApiBaseUrl}>{children}</MemoryApiProvider>
    </SharedAuthProvider>
  );
}
