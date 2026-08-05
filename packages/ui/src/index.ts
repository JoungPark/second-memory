import type { ReactNode } from 'react';

export const uiVersion = '0.1.0';

export type SharedWelcomeProps = {
  productName?: string;
  children: (message: string) => ReactNode;
};

export function SharedWelcome({
  productName = 'Second Memory',
  children,
}: SharedWelcomeProps) {
  const message = `Welcome to ${productName}. Capture today, remember forever.`;
  return children(message);
}
