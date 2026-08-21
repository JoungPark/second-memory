'use client';

import { useAskChat, type ChatMessage } from '@second-memory/ui';
import { useEffect, useRef, useState } from 'react';

function AssistantMessageMeta({ message }: { message: ChatMessage }) {
  if (message.role !== 'assistant') {
    return null;
  }

  const citations = message.citations ?? [];

  return (
    <>
      {message.lowConfidenceFlag ? (
        <p className="mt-1 text-xs text-amber-700">
          Low confidence — answer may be incomplete
        </p>
      ) : null}
      {citations.length > 0 ? (
        <ul className="mt-2 space-y-1 border-t border-zinc-100 pt-2">
          {citations.map((citation) => (
            <li key={citation.memoryId} className="text-xs text-zinc-500">
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600">
                {citation.entryType}
              </span>{' '}
              {citation.excerpt}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function AskScreen() {
  const { messages, sendMessage, submitting, error } = useAskChat();
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || submitting) {
      return;
    }

    setText('');
    await sendMessage(trimmed);
  }

  return (
    <div className="flex h-96 flex-col rounded-lg border border-zinc-200 bg-zinc-50">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">
            Ask a question about your memories.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-zinc-900 text-white'
                    : 'border border-zinc-200 bg-white text-zinc-900'
                }`}
              >
                {message.content}
                <AssistantMessageMeta message={message} />
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex flex-col gap-2 border-t border-zinc-200 bg-white p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Type a message…"
            disabled={submitting}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!text.trim() || submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {submitting ? 'Sending…' : 'Send'}
          </button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
