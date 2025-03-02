export type ChatMode = 'conversational' | 'interactive' | 'context-menu';

export interface Message {
  role: string;
  content: string;
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

import { defaultLanguageStorage } from '@extension/storage';
import { getLanguageNameFromCode } from '@extension/i18n';

export const getTranslateTitle = async () => {
  const targetLang = await defaultLanguageStorage.get();
  return `Translate to ${getLanguageNameFromCode(targetLang)}`;
};

export const getTranslatePrompt = async (text: string) => {
  const targetLang = await defaultLanguageStorage.get();
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
];

export interface ChatConfig {
  mode: ChatMode;
  selectedModel: string;
  contextMenuAction?: ContextMenuAction;
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
  setContextMenuAction: (action: ContextMenuAction | undefined) => void;
  setMode: (mode: ChatMode) => void;
}
