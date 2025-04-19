export type ChatMode = 'conversational' | 'interactive';

export interface Message {
  id?: string;
  role: string;
  content: string;
  metadata?: {
    timestamp?: number;
    questionId?: string;
    originalQuestion?: string;
    extractedData?: any;
    sourceUrl?: string;
    isTaskList?: boolean;
    tasks?: any[];
    systemMessageType?: string;
    isDeleted?: boolean;
    messageId?: number;
  };
  model?: {
    name: string;
    displayName?: string;
    provider: string;
  };
  images?: Array<{
    url: string;
    mimeType?: string;
  }>;
}

export interface TaskStep {
  description: string;
  action: 'click' | 'type' | 'navigate' | 'wait' | 'extract' | 'search';
  target?: string;
  value?: string;
  selector?: string;
  query?: string;
}

export interface TaskPlan {
  goal: string;
  steps: TaskStep[];
  estimated_time: string;
}

export interface ContextMenuAction {
  id: string;
  title: string;
  prompt: (text: string) => Promise<string> | string;
  icon?: string; // Lucid icon name
}

import { llmResponseLanguageStorage } from '@extension/storage';
import { getLanguageNameFromCode } from '@extension/i18n';

export const getTranslateTitle = async () => {
  const targetLang = await llmResponseLanguageStorage.get();
  return `Translate to ${getLanguageNameFromCode(targetLang)}`;
};

export const getTranslatePrompt = async (text: string) => {
  const targetLang = await llmResponseLanguageStorage.get();
  return `Translate the following text to ${getLanguageNameFromCode(targetLang)}: "${text}"`;
};

export const CONTEXT_MENU_ACTIONS: ContextMenuAction[] = [
  {
    id: 'translate',
    title: 'Translate',
    prompt: async text => getTranslatePrompt(text),
    icon: 'Languages',
  },
  {
    id: 'explain',
    title: 'Explain This',
    prompt: text => `Explain this in simple terms: "${text}"`,
    icon: 'HelpCircle',
  },
  {
    id: 'improve',
    title: 'Improve Writing',
    prompt: text => `Improve this text while maintaining its meaning: "${text}"`,
    icon: 'Sparkles',
  },
  {
    id: 'summarize',
    title: 'Summarize',
    prompt: text => `Provide a concise summary of: "${text}"`,
    icon: 'FileText',
  },
  {
    id: 'take-note',
    title: 'Take Note',
    prompt: text => `Selected text: "${text}"`,
    icon: 'Bookmark',
  },
  {
    id: 'create-todo',
    title: 'Create Todo',
    prompt: text => `Create a todo task with title: "${text}"`,
    icon: 'ListTodo',
  },
];

export interface ChatConfig {
  mode: ChatMode;
  selectedModel: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface ChatContextValue {
  state: ChatState;
  config: ChatConfig;
  sendMessage: (content: string) => Promise<void>;
  setMode: (mode: ChatMode) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}
