'use client';

import {
  onAuthStateChanged,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  getAuth: () => Auth;
  signIn: () => Promise<void>;
  children: ReactNode;
};

export function AuthProvider({ getAuth, signIn, children }: AuthProviderProps) {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuth(getAuth());
  }, [getAuth]);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, [auth]);

  const signInWithGoogle = useCallback(async () => {
    await signIn();
  }, [signIn]);

  const signOutUser = useCallback(async () => {
    if (!auth) {
      return;
    }

    await signOut(auth);
  }, [auth]);

  const getIdToken = useCallback(async () => {
    if (!auth?.currentUser) {
      return null;
    }

    return auth.currentUser.getIdToken();
  }, [auth]);

  const value = useMemo(
    () => ({
      user,
      loading,
      signInWithGoogle,
      signOutUser,
      getIdToken,
    }),
    [user, loading, signInWithGoogle, signOutUser, getIdToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
