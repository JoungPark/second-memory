'use client';

import { useState } from 'react';

export function SelfTalkScreen() {
  const [text, setText] = useState('');

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    setText('');
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
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          Send
        </button>
      </div>
    </div>
  );
}
