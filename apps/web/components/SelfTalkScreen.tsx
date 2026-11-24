'use client';

import { useMemoryApi, useRecentMemories } from '@second-memory/ui';
import { useState } from 'react';

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
    <div className="flex flex-col gap-3">
      {!recent.visible ? (
        <button
          type="button"
          onClick={() => void recent.show()}
          className="self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Show recent memories
        </button>
      ) : null}

      {recent.visible ? (
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3">
          {recent.loading ? (
            <p className="text-sm text-zinc-500">Loading memories…</p>
          ) : recent.error ? (
            <p className="text-sm text-red-600">{recent.error}</p>
          ) : recent.items.length === 0 ? (
            <p className="text-sm text-zinc-500">No memories yet</p>
          ) : (
            <>
              <div className="pb-1">
                {recent.hasMore ? (
                  <button
                    type="button"
                    onClick={() => void recent.loadOlder()}
                    disabled={recent.loadingMore}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {recent.loadingMore ? 'Loading…' : 'Load older memories'}
                  </button>
                ) : (
                  <p className="text-sm text-zinc-500">No more previous message</p>
                )}
              </div>
              <ul className="flex flex-col gap-2">
                {recent.items.map((memory) => (
                  <li
                    key={memory.id}
                    className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <time dateTime={memory.occurredAt}>
                        {new Date(memory.occurredAt).toLocaleString()}
                      </time>
                      <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-zinc-700">
                        {memory.entryType}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-900">{memory.content}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

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
