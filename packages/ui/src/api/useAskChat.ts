'use client';

import { useCallback, useState } from 'react';
import type { ChatMessage } from '../AppMode';
import { useAskApi } from './AskApiProvider';

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

export function useAskChat() {
  const askApi = useAskApi();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || submitting) {
        return;
      }

      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: 'user',
        content: trimmed,
      };

      setMessages((current) => [...current, userMessage]);
      setSubmitting(true);
      setError(null);

      try {
        const response = await askApi.sendMessage({
          sessionId,
          message: trimmed,
        });

        setSessionId(response.sessionId);

        const assistantMessage: ChatMessage = {
          id: createMessageId(),
          role: 'assistant',
          content: response.answer,
          citations: response.citations,
          lowConfidenceFlag: response.lowConfidenceFlag,
        };

        setMessages((current) => [...current, assistantMessage]);
      } catch (sendError) {
        setError(
          sendError instanceof Error ? sendError.message : 'Failed to send message',
        );
      } finally {
        setSubmitting(false);
      }
    },
    [askApi, sessionId, submitting],
  );

  return {
    messages,
    sendMessage,
    submitting,
    error,
  };
}
