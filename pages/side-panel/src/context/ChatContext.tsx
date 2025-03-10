import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useStorage } from '@extension/shared';
import { defaultLanguageStorage } from '@extension/storage';
import type { PageContext } from '../services/llm/prompts';
import { t } from '@extension/i18n';

interface Message {
  role: string;
  content: string;
  model?: {
    name: string;
    displayName?: string;
    provider: string;
  };
  metadata?: {
    questionId?: string;
    originalQuestion?: string;
    extractedData?: any;
    timestamp?: number;
  };
}

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  pageContext: PageContext | null;
  setPageContext: React.Dispatch<React.SetStateAction<PageContext | null>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  initialInput?: string;
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ initialInput, children }) => {
  const defaultLanguage = useStorage(defaultLanguageStorage);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialInput || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);

  // Update translations when language changes
  useEffect(() => {
    if (defaultLanguage) {
      // Set the locale directly from storage - use string type for defaultLanguage
      // @ts-expect-error - DevLocale type not available from @extension/i18n
      t.devLocale = defaultLanguage;
      console.log('ChatContext: Language set to', defaultLanguage);
    }
  }, [defaultLanguage]);

  // Process initialInput if provided
  useEffect(() => {
    if (initialInput && !isLoading) {
      console.log('Debug: Setting input from initialInput:', initialInput);
      setInput(initialInput);
    }
  }, [initialInput, isLoading]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        input,
        setInput,
        isLoading,
        setIsLoading,
        error,
        setError,
        pageContext,
        setPageContext,
      }}>
      {children}
    </ChatContext.Provider>
  );
};
