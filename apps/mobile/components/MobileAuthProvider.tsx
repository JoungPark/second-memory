import { AuthProvider as SharedAuthProvider, MemoryApiProvider } from '@second-memory/ui';
import { useEffect, type ReactNode } from 'react';

import { getMemoryApiBaseUrl } from '@/lib/api/base-url';
import { getFirebaseAuth } from '@/lib/firebase/client';
import {
  configureGoogleSignIn,
  signInWithGoogle,
} from '@/lib/firebase/sign-in';

type MobileAuthProviderProps = {
  children: ReactNode;
};

export function MobileAuthProvider({ children }: MobileAuthProviderProps) {
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  return (
    <SharedAuthProvider getAuth={getFirebaseAuth} signIn={signInWithGoogle}>
      <MemoryApiProvider baseUrl={getMemoryApiBaseUrl()}>{children}</MemoryApiProvider>
    </SharedAuthProvider>
  );
}
