import { useMemoryApi, useRecentMemories } from '@second-memory/ui';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export function SelfTalkScreen() {
  const memoryApi = useMemoryApi();
  const recent = useRecentMemories();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await memoryApi.createMemory({
        entryType: 'self_talk',
        content: trimmed,
      });
      setText('');
      if (recent.visible) {
        await recent.refresh();
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to save memory');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        {!recent.visible ? (
          <Pressable style={styles.toggleButton} onPress={() => void recent.show()}>
            <Text style={styles.toggleButtonText}>Show recent memories</Text>
          </Pressable>
        ) : null}

        {recent.visible ? (
          <View style={styles.recentPanel}>
            {recent.loading ? (
              <Text style={styles.mutedText}>Loading memories…</Text>
            ) : recent.error ? (
              <Text style={styles.error}>{recent.error}</Text>
            ) : recent.items.length === 0 ? (
              <Text style={styles.mutedText}>No memories yet</Text>
            ) : (
              <ScrollView
                style={styles.memoryScroll}
                contentContainerStyle={styles.memoryScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.paginationFooter}>
                  {recent.hasMore ? (
                    <Pressable
                      style={[
                        styles.loadOlderButton,
                        recent.loadingMore && styles.loadOlderButtonDisabled,
                      ]}
                      disabled={recent.loadingMore}
                      onPress={() => void recent.loadOlder()}
                    >
                      {recent.loadingMore ? (
                        <ActivityIndicator size="small" color="#3f3f46" />
                      ) : (
                        <Text style={styles.loadOlderButtonText}>Load older memories</Text>
                      )}
                    </Pressable>
                  ) : (
                    <Text style={styles.mutedText}>No more previous message</Text>
                  )}
                </View>
                <View style={styles.memoryList}>
                  {recent.items.map((memory) => (
                    <View key={memory.id} style={styles.memoryRow}>
                      <View style={styles.memoryMeta}>
                        <Text style={styles.memoryDate}>
                          {new Date(memory.occurredAt).toLocaleString()}
                        </Text>
                        <Text style={styles.memoryType}>{memory.entryType}</Text>
                      </View>
                      <Text style={styles.memoryContent}>{memory.content}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.bottomSection}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="What's on your mind?"
          placeholderTextColor="#a1a1aa"
          multiline
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, (!text.trim() || submitting) && styles.buttonDisabled]}
            disabled={!text.trim() || submitting}
            onPress={() => void handleSend()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Send</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  topSection: {
    flex: 1,
    gap: 12,
    minHeight: 0,
  },
  bottomSection: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
  },
  toggleButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3f3f46',
  },
  recentPanel: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    padding: 12,
  },
  memoryScroll: {
    flex: 1,
  },
  memoryScrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  memoryList: {
    gap: 8,
  },
  memoryRow: {
    borderWidth: 1,
    borderColor: '#f4f4f5',
    backgroundColor: '#fafafa',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  memoryMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  memoryDate: {
    fontSize: 12,
    color: '#71717a',
  },
  memoryType: {
    fontSize: 12,
    color: '#3f3f46',
    backgroundColor: '#e4e4e7',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  memoryContent: {
    fontSize: 14,
    color: '#18181b',
  },
  paginationFooter: {
    paddingBottom: 4,
  },
  loadOlderButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  loadOlderButtonDisabled: {
    opacity: 0.5,
  },
  loadOlderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3f3f46',
  },
  mutedText: {
    fontSize: 14,
    color: '#71717a',
  },
  input: {
    minHeight: 120,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#18181b',
    textAlignVertical: 'top',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#d4d4d8',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
