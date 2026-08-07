import { LoginButton as SharedLoginButton } from '@second-memory/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { signOutGoogle } from '@/lib/firebase/sign-in';

export function LoginButton() {
  return (
    <SharedLoginButton>
      {({ user, loading, signInWithGoogle, signOutUser }) => {
        if (loading) {
          return (
            <Pressable disabled style={[styles.button, styles.buttonDisabled]}>
              <Text style={styles.buttonDisabledText}>Loading…</Text>
            </Pressable>
          );
        }

        if (user) {
          return (
            <View style={styles.signedIn}>
              <Text style={styles.signedInText}>
                Signed in as{' '}
                <Text style={styles.signedInName}>
                  {user.displayName ?? user.email ?? 'User'}
                </Text>
              </Text>
              <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={() =>
                  void (async () => {
                    await signOutGoogle();
                    await signOutUser();
                  })()
                }
              >
                <Text style={styles.buttonSecondaryText}>Sign out</Text>
              </Pressable>
            </View>
          );
        }

        return (
          <Pressable
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => void signInWithGoogle()}
          >
            <Text style={styles.buttonPrimaryText}>Sign in with Google</Text>
          </Pressable>
        );
      }}
    </SharedLoginButton>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#18181b',
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d4d4d8',
  },
  buttonSecondaryText: {
    color: '#18181b',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#e4e4e7',
  },
  buttonDisabledText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '600',
  },
  signedIn: {
    alignItems: 'center',
    gap: 12,
  },
  signedInText: {
    color: '#52525b',
    fontSize: 14,
    textAlign: 'center',
  },
  signedInName: {
    color: '#18181b',
    fontWeight: '600',
  },
});
