import { SharedWelcome } from '@second-memory/ui';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <section className="w-full max-w-xl rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-3 text-2xl font-semibold text-zinc-900">Web</h1>
        <SharedWelcome>
          {(message) => <p className="text-zinc-700">{message}</p>}
        </SharedWelcome>
      </section>
    </main>
  );
}
