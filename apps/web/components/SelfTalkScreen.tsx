'use client';

import { useMemoryApi } from '@second-memory/ui';
import { useState } from 'react';

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
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="What's on your mind?"
        rows={4}
        className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!text.trim() || submitting}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
