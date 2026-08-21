import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AskApiProvider, MemoryApiProvider } from '@second-memory/ui';

import { AuthProvider } from '@/components/auth/AuthProvider';

import './globals.css';

const memoryApiBaseUrl =
  process.env.NEXT_PUBLIC_MEMORY_API_URL ?? 'http://localhost:3001';
const askApiBaseUrl =
  process.env.NEXT_PUBLIC_ASK_API_URL ?? 'http://localhost:3002';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Second Memory',
  description: 'Capture today, remember forever.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <MemoryApiProvider baseUrl={memoryApiBaseUrl}>
            <AskApiProvider baseUrl={askApiBaseUrl}>{children}</AskApiProvider>
          </MemoryApiProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
