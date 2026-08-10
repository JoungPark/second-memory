import { useMemoryApi } from '@second-memory/ui';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export function SelfTalkScreen() {
  const memoryApi = useMemoryApi();
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
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to save memory');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  input: {
    minHeight: 120,
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
