import {
  type AppMode,
  useAskChat,
  useBackendHealth,
  type ChatMessage,
} from '@second-memory/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { useKeyboardBottomInset } from '@/lib/useKeyboardBottomInset';

function AssistantMessageMeta({ message }: { message: ChatMessage }) {
  if (message.role !== 'assistant') {
    return null;
  }

  const citations = message.citations ?? [];

  return (
    <>
      {message.lowConfidenceFlag ? (
        <Text style={styles.lowConfidenceText}>
          Low confidence — answer may be incomplete
        </Text>
      ) : null}
      {citations.length > 0 ? (
        <View style={styles.citationsContainer}>
          {citations.map((citation) => (
            <Text key={citation.memoryId} style={styles.citationText}>
              <Text style={styles.citationLabel}>{citation.entryType}</Text>{' '}
              {citation.excerpt}
            </Text>
          ))}
        </View>
      ) : null}
    </>
  );
}

type AskScreenProps = {
  mode: AppMode;
};

export function AskScreen({ mode }: AskScreenProps) {
  const { messages, sendMessage, submitting, error } = useAskChat();
  const { canSend, status } = useBackendHealth();
  const sendEnabled = canSend(mode);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const insets = useSafeAreaInsets();
  const keyboardBottomInset = useKeyboardBottomInset();
  const bottomPadding =
    Platform.OS === 'android'
      ? 16 + keyboardBottomInset
      : Math.max(insets.bottom, 16);

  const scrollToLatest = useCallback((animated = true) => {
    if (messages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, [messages.length]);

  useEffect(() => {
    scrollToLatest();
  }, [messages, scrollToLatest]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || submitting || !sendEnabled) {
      return;
    }

    setText('');
    await sendMessage(trimmed);
  }

  return (
    <KeyboardAwareScreen>
      <View style={styles.messagesSection}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.messagesScroll}
          contentContainerStyle={
            messages.length === 0 ? styles.messagesEmpty : styles.messagesContent
          }
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollToLatest(false)}
          onLayout={() => scrollToLatest(false)}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Ask a question about your memories.
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageRow,
                item.role === 'user'
                  ? styles.messageRowUser
                  : styles.messageRowAssistant,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  item.role === 'user'
                    ? styles.bubbleUser
                    : styles.bubbleAssistant,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    item.role === 'user'
                      ? styles.bubbleTextUser
                      : styles.bubbleTextAssistant,
                  ]}
                >
                  {item.content}
                </Text>
                <AssistantMessageMeta message={item} />
              </View>
            </View>
          )}
        />
      </View>

      <View style={[styles.bottomSection, { paddingBottom: bottomPadding }]}>
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor="#a1a1aa"
            style={styles.input}
            editable={!submitting}
            onSubmitEditing={() => void handleSend()}
            returnKeyType="send"
          />
          <Pressable
            style={[
              styles.sendButton,
              (!text.trim() || submitting || !sendEnabled) && styles.sendButtonDisabled,
            ]}
            disabled={!text.trim() || submitting || !sendEnabled}
            onPress={() => void handleSend()}
          >
            <Text style={styles.sendButtonText}>
              {submitting
                ? 'Sending…'
                : status === 'checking'
                  ? 'Checking…'
                  : 'Send'}
            </Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  messagesSection: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 12,
    gap: 12,
  },
  messagesEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#71717a',
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleUser: {
    backgroundColor: '#18181b',
  },
  bubbleAssistant: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  bubbleText: {
    fontSize: 14,
  },
  bubbleTextUser: {
    color: '#ffffff',
  },
  bubbleTextAssistant: {
    color: '#18181b',
  },
  lowConfidenceText: {
    marginTop: 4,
    fontSize: 12,
    color: '#b45309',
  },
  citationsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f5',
    gap: 4,
  },
  citationText: {
    fontSize: 12,
    color: '#71717a',
  },
  citationLabel: {
    backgroundColor: '#f4f4f5',
    color: '#52525b',
    overflow: 'hidden',
  },
  bottomSection: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#18181b',
  },
  sendButton: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d4d4d8',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
});
