import React, { useRef, useEffect } from 'react';
import { MessageItem } from './MessageItem';
import { LoadingMessage } from './LoadingMessage';
import { ErrorMessage } from './ErrorMessage';
import { PageContext } from '../services/llm/prompts';

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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-full">
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
