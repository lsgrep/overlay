export interface Message {
  role: string;
  content: string;
}

export interface LLMConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export interface LLMService {
  generateCompletion(messages: Message[], context: string, config?: LLMConfig): Promise<string>;
}
