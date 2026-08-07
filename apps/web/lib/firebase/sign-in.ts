import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase/client';

export async function signInWithGoogle(): Promise<void> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}
