import { useBackendHealth } from '@second-memory/ui';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getAskApiBaseUrl, getMemoryApiBaseUrl } from '@/lib/api/base-url';

export function WakeBackendSection() {
  const { status, results, refresh } = useBackendHealth();
  const waking = status === 'checking';

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Ping backend services to wake them from sleep before using the app.
      </Text>

      <Text style={styles.label}>Memory API</Text>
      <Text style={styles.url}>{getMemoryApiBaseUrl()}</Text>
      <Text style={styles.label}>Ask API</Text>
      <Text style={styles.url}>{getAskApiBaseUrl()}</Text>

      <Pressable
        style={[styles.wakeButton, waking && styles.wakeButtonDisabled]}
        disabled={waking}
        onPress={() => void refresh()}
      >
        {waking ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.wakeButtonText}>Wake backend</Text>
        )}
      </Pressable>

      {results.length > 0 ? (
        <View style={styles.results}>
          {results.map((result) => (
            <Text
              key={result.service}
              style={result.ok ? styles.resultOk : styles.resultError}
            >
              {result.service}: {result.ok ? 'ok' : 'failed'} ({result.latencyMs}ms)
              {result.error ? ` — ${result.error}` : ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  description: {
    fontSize: 13,
    color: '#71717a',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  url: {
    fontSize: 12,
    color: '#3f3f46',
    fontFamily: 'monospace',
  },
  wakeButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#3f3f46',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  wakeButtonDisabled: {
    opacity: 0.7,
  },
  wakeButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  results: {
    marginTop: 4,
    gap: 4,
  },
  resultOk: {
    fontSize: 12,
    color: '#16a34a',
  },
  resultError: {
    fontSize: 12,
    color: '#dc2626',
  },
});
