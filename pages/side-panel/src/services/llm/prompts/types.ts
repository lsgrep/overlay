export interface PageContext {
  title?: string;
  url?: string;
  content?: string;
}

export interface ModelInfo {
  name: string;
  provider: string;
  displayName?: string;
}

export type ChatMode = 'interactive' | 'conversational' | 'context-menu';

export interface PromptGenerator {
  generateSystemPrompt(): string;
  generateInteractivePrompt(): string;
  generateConversationalPrompt(): string;
}
