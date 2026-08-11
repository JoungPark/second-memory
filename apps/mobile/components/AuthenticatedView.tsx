import { useState } from 'react';
import type { AppMode } from '@second-memory/ui';
import { useAuth } from '@second-memory/ui';
import type { User } from 'firebase/auth';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AskScreen } from '@/components/AskScreen';
import { ModeSwitch } from '@/components/ModeSwitch';
import { SelfTalkScreen } from '@/components/SelfTalkScreen';
import { signOutGoogle } from '@/lib/firebase/sign-in';

type AuthenticatedViewProps = {
  user: User;
};

export function AuthenticatedView({ user }: AuthenticatedViewProps) {
  const { signOutUser } = useAuth();
  const [mode, setMode] = useState<AppMode>('self-talk');
  const displayName = user.displayName ?? user.email ?? 'User';

  async function handleSignOut() {
    await signOutGoogle();
    await signOutUser();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Second Memory</Text>
      <View style={styles.header}>
        <Text style={styles.userName}>{displayName}</Text>
        <Pressable style={styles.signOutButton} onPress={() => void handleSignOut()}>
          <Text style={styles.signOutButtonText}>Sign out</Text>
        </Pressable>
      </View>

      <ModeSwitch mode={mode} onModeChange={setMode} />

      <View style={styles.content}>
        {mode === 'self-talk' ? <SelfTalkScreen /> : <AskScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    gap: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  userName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#18181b',
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  signOutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181b',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
});
