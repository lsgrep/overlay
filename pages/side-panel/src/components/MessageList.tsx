import type React from 'react';
import { useRef, useEffect, useState } from 'react';
import { MessageItem } from './MessageItem';
import { LoadingMessage } from './LoadingMessage';
import { ErrorMessage } from './ErrorMessage';
import type { PageContext } from '../services/llm/prompts';
import { t } from '@extension/i18n';
import { useStorage } from '@extension/shared';
import { defaultLanguageStorage } from '@extension/storage';

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

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  mode: 'interactive' | 'conversational';
  isLight: boolean;
  pageContext: PageContext | null;
  selectedModel: string;
  fontFamily: string;
  fontSize: number;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  error,
  mode,
  isLight,
  pageContext,
  selectedModel,
  fontFamily,
  fontSize,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const defaultLanguage = useStorage(defaultLanguageStorage);

  // Update translations when language changes
  useEffect(() => {
    if (defaultLanguage) {
      // @ts-expect-error - DevLocale type not available from @extension/i18n
      t.devLocale = defaultLanguage;
      console.log('MessageList: Language set to', defaultLanguage);
    }
  }, [defaultLanguage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 max-w-full scrollbar-thin scrollbar-thumb-muted-foreground/30 bg-background text-foreground">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full opacity-70">
          <div className="text-center p-4 bg-muted/20 border border-border rounded-lg max-w-sm">
            <h3 className="font-medium mb-2">{t('sidepanel_welcome_title', 'Welcome to Overlay')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('sidepanel_welcome_message', 'Start a conversation or ask a question about the current page.')}
            </p>
          </div>
        </div>
      )}
      {messages.map((message, index) => (
        <MessageItem
          key={index}
          message={message}
          index={index}
          isLight={isLight}
          mode={mode}
          pageContext={pageContext}
          selectedModel={selectedModel}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      ))}
      {isLoading && <LoadingMessage />}
      {error && <ErrorMessage error={error} />}
      <div ref={messagesEndRef} />
    </div>
  );
};
