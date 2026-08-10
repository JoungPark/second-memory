import { useAuth, SharedWelcome } from '@second-memory/ui';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthenticatedView } from '@/components/AuthenticatedView';
import { LoginButton } from '@/components/LoginButton';

export function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#71717a" />
      </View>
    );
  }

  if (user) {
    return <AuthenticatedView user={user} />;
  }

  return (
    <View style={styles.guest}>
      <Text style={styles.title}>Second Memory</Text>
      <SharedWelcome>
        {(message) => <Text style={styles.message}>{message}</Text>}
      </SharedWelcome>
      <LoginButton />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guest: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#3f3f46',
    textAlign: 'center',
  },
});
