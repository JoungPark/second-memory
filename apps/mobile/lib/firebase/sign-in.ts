import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase/client';

export function configureGoogleSignIn(): void {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID,
  });
}

export async function signInWithGoogle(): Promise<void> {
  await GoogleSignin.hasPlayServices();
  console.log('start Google sign-in');
  const response = await GoogleSignin.signIn();

  console.log('Google sign-in response:', response);

  if (!isSuccessResponse(response)) {
    return;
  }

  const idToken = response.data.idToken;

  if (!idToken) {
    throw new Error('Google sign-in returned no ID token');
  }

  await signInWithCredential(
    getFirebaseAuth(),
    GoogleAuthProvider.credential(idToken),
  );
}

export async function signOutGoogle(): Promise<void> {
  await GoogleSignin.signOut();
}
