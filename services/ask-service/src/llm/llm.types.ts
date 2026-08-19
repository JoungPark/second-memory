export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionResult {
  content: string;
  usage?: ChatCompletionUsage;
}

export interface LlmService {
  chat(messages: ChatMessage[]): Promise<ChatCompletionResult>;
}
