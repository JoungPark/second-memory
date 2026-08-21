import type { AskCitation } from '@second-memory/shared-types';

export type AppMode = 'self-talk' | 'ask';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: AskCitation[];
  lowConfidenceFlag?: boolean;
};
