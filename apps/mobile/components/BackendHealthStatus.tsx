import {
  getRequiredService,
  isServiceHealthy,
  type AppMode,
  useBackendHealth,
} from '@second-memory/ui';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type BackendHealthStatusProps = {
  mode: AppMode;
};

export function BackendHealthStatus({ mode }: BackendHealthStatusProps) {
  const { status, results, refresh } = useBackendHealth();

  if (status === 'healthy') {
    return null;
  }

  if (status === 'checking') {
    return (
      <View style={styles.checkingContainer}>
        <ActivityIndicator size="small" color="#71717a" />
        <Text style={styles.checkingText}>Checking backend…</Text>
      </View>
    );
  }

  const requiredService = getRequiredService(mode);
  const serviceHealthy = isServiceHealthy(results, requiredService);
  const failedResult = results.find((result) => result.service === requiredService);

  if (serviceHealthy) {
    return null;
  }

  const serviceLabel =
    requiredService === 'memory-service' ? 'Memory service' : 'Ask service';

  return (
    <View style={styles.container}>
      <Text style={styles.errorText}>
        {serviceLabel} unavailable
        {failedResult?.error ? ` — ${failedResult.error}` : ''}
      </Text>
      <Pressable style={styles.retryButton} onPress={() => void refresh()}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkingText: {
    fontSize: 13,
    color: '#71717a',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#dc2626',
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
});
