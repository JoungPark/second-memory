export type AppMode = 'self-talk' | 'ask';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};
