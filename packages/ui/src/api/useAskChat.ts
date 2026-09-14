'use client';

import { useCallback, useState } from 'react';
import type { ChatMessage } from '../AppMode';
import { useAskApi } from './AskApiProvider';

export type AskChatPhase = 'chat' | 'summary';

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
  const [phase, setPhase] = useState<AskChatPhase>('chat');
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetSession = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
    setPhase('chat');
    setSummaryText(null);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || submitting || saving || phase !== 'chat') {
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
    [askApi, phase, saving, sessionId, submitting],
  );

  const saveSession = useCallback(async () => {
    if (!sessionId || saving || submitting || messages.length === 0 || phase !== 'chat') {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await askApi.endSession({ sessionId });
      setSummaryText(response.summaryText);
      setPhase('summary');
      setSessionId(undefined);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Failed to save conversation',
      );
    } finally {
      setSaving(false);
    }
  }, [askApi, messages.length, phase, saving, sessionId, submitting]);

  const closeSession = useCallback(async () => {
    if (phase === 'summary') {
      resetSession();
      return;
    }

    if (!sessionId || messages.length === 0) {
      resetSession();
      return;
    }

    setError(null);

    try {
      await askApi.closeSession({ sessionId });
    } catch (closeError) {
      setError(
        closeError instanceof Error ? closeError.message : 'Failed to close session',
      );
      return;
    }

    resetSession();
  }, [askApi, messages.length, phase, resetSession, sessionId]);

  return {
    messages,
    sendMessage,
    saveSession,
    closeSession,
    submitting,
    saving,
    error,
    hasConversation: messages.length > 0,
    phase,
    summaryText,
  };
}
