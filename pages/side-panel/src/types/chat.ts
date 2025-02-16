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
}

import { getDefaultLanguage } from '@extension/storage';

export const getTranslateTitle = async () => {
  const targetLang = await getDefaultLanguage();
  return `Translate to ${targetLang || 'English'}`;
};

export const getTranslatePrompt = async (text: string) => {
  const targetLang = await getDefaultLanguage();
  return `Translate the following text to ${targetLang || 'English'}: "${text}"`;
};

export const CONTEXT_MENU_ACTIONS: ContextMenuAction[] = [
  {
    id: 'translate',
    title: 'Translate',
    prompt: async text => getTranslatePrompt(text),
  },
  {
    id: 'explain',
    title: 'Explain This',
    prompt: text => `Explain this in simple terms: "${text}"`,
  },
  {
    id: 'improve',
    title: 'Improve Writing',
    prompt: text => `Improve this text while maintaining its meaning: "${text}"`,
  },
  {
    id: 'summarize',
    title: 'Summarize',
    prompt: text => `Provide a concise summary of: "${text}"`,
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
