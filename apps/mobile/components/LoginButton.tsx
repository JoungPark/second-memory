import { LoginButton as SharedLoginButton } from '@second-memory/ui';
import { Pressable, StyleSheet, Text } from 'react-native';

export function LoginButton() {
  return (
    <SharedLoginButton>
      {({ loading, signInWithGoogle }) => {
        if (loading) {
          return (
            <Pressable disabled style={[styles.button, styles.buttonDisabled]}>
              <Text style={styles.buttonDisabledText}>Loading…</Text>
            </Pressable>
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
  buttonDisabled: {
    backgroundColor: '#e4e4e7',
  },
  buttonDisabledText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '600',
  },
});
