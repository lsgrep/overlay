export interface PageContext {
  title?: string;
  url?: string;
  content?: string;
  originalHtml?: string;
  isPdf?: boolean;
  metadata?: {
    // Additional page metadata that might be useful
    lastModified?: string;
    author?: string;
    description?: string;
    keywords?: string[];
    selectedText?: string;
    visibleElements?: ElementInfo[];
    userTasks?: string[];
  };
}

export interface ElementInfo {
  type: string;
  text?: string;
  attributes?: Record<string, string>;
  isVisible: boolean;
  rect?: DOMRect;
}

export interface ModelInfo {
  name: string;
  provider: string;
  displayName?: string;
  contextWindow?: number;
  capabilities?: string[];
}

export type ChatMode = 'interactive' | 'conversational';

export interface ActionContext {
  sessionId: string;
  previousActions?: string[];
  availableTools?: string[];
  userPreferences?: Record<string, any>;
  browserCapabilities?: string[];
}

export interface PromptGenerator {
  generateSystemPrompt(goal?: string): string;
  generateInteractivePrompt(actionContext?: ActionContext): string;
  generateConversationalPrompt(): string;
  generateExtractionPrompt(pageContent: string, question: string): string;

  // New methods for advanced prompting
  generateWebNavigationPrompt?(context: PageContext): string;
  generateDataExtractionPrompt?(context: PageContext, schema: any): string;
  generateTaskDecompositionPrompt?(goal: string): string;
}
