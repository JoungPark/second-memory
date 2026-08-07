'use client';

import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';

import { useAuth } from './AuthProvider';

export type LoginButtonRenderProps = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

export type LoginButtonProps = {
  children: (props: LoginButtonRenderProps) => ReactNode;
};

export function LoginButton({ children }: LoginButtonProps) {
  const authState = useAuth();
  return children(authState);
}
