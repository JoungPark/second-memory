import type { User } from 'firebase/auth';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsSection';
import { WakeBackendSection } from '@/components/settings/WakeBackendSection';

type SettingsScreenProps = {
  user: User;
  onBack: () => void;
};

export function SettingsScreen({ user, onBack }: SettingsScreenProps) {
  const displayName = user.displayName ?? user.email ?? 'User';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <SettingsSection title="Account">
          <Text style={styles.accountName}>{displayName}</Text>
          {user.email ? <Text style={styles.accountEmail}>{user.email}</Text> : null}
        </SettingsSection>

        <SettingsSection title="Backend">
          <WakeBackendSection />
        </SettingsSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
    minHeight: 0,
  },
  header: {
    gap: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3f3f46',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#18181b',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 20,
    paddingBottom: 16,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181b',
  },
  accountEmail: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 2,
  },
});
