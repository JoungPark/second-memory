import { useState } from 'react';
import {
  BackendHealthProvider,
  type AppMode,
  useAuth,
} from '@second-memory/ui';
import type { User } from 'firebase/auth';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AskScreen } from '@/components/AskScreen';
import { BackendHealthStatus } from '@/components/BackendHealthStatus';
import { ModeSwitch } from '@/components/ModeSwitch';
import { SelfTalkScreen } from '@/components/SelfTalkScreen';
import { SettingsScreen } from '@/components/settings/SettingsScreen';
import { wakeBackendServices } from '@/lib/api/wake-backend';
import { signOutGoogle } from '@/lib/firebase/sign-in';

type AuthenticatedScreen = 'main' | 'settings';

type AuthenticatedViewProps = {
  user: User;
};

export function AuthenticatedView({ user }: AuthenticatedViewProps) {
  const { signOutUser } = useAuth();
  const [screen, setScreen] = useState<AuthenticatedScreen>('main');
  const [mode, setMode] = useState<AppMode>('self-talk');
  const displayName = user.displayName ?? user.email ?? 'User';

  async function handleSignOut() {
    await signOutGoogle();
    await signOutUser();
  }

  return (
    <BackendHealthProvider checkHealth={wakeBackendServices}>
      {screen === 'settings' ? (
        <SafeAreaView style={styles.container}>
          <SettingsScreen user={user} onBack={() => setScreen('main')} />
        </SafeAreaView>
      ) : (
        <SafeAreaView style={styles.container}>
          <Text style={styles.title}>Second Memory</Text>
          <View style={styles.header}>
            <Text style={styles.userName}>{displayName}</Text>
            <View style={styles.headerActions}>
              <Pressable style={styles.headerButton} onPress={() => setScreen('settings')}>
                <Text style={styles.headerButtonText}>Settings</Text>
              </Pressable>
              <Pressable style={styles.headerButton} onPress={() => void handleSignOut()}>
                <Text style={styles.headerButtonText}>Sign out</Text>
              </Pressable>
            </View>
          </View>

          <BackendHealthStatus mode={mode} />

          <ModeSwitch mode={mode} onModeChange={setMode} />

          <View style={styles.content}>
            {mode === 'self-talk' ? (
              <SelfTalkScreen mode={mode} />
            ) : (
              <AskScreen mode={mode} />
            )}
          </View>
        </SafeAreaView>
      )}
    </BackendHealthProvider>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181b',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
});
