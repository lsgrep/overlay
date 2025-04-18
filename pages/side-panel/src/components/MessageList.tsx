import type React from 'react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { MessageItem } from './MessageItem';
import { LoadingMessage } from './LoadingMessage';
import { ErrorMessage } from './ErrorMessage';
import type { PageContext } from '../services/llm/prompts';
import { t } from '@extension/i18n';
import { useStorage } from '@extension/shared';
import { defaultLanguageStorage } from '@extension/storage';
import { useChat } from '../contexts/ChatContext';

interface Message {
  id: string; // Unique ID for each message
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
    sourceUrl?: string;
    isTaskList?: boolean;
    tasks?: any[];
    systemMessageType?: string;
    messageId?: number;
  };
  images?: Array<{
    url: string;
    mimeType?: string;
  }>;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  mode: 'interactive' | 'conversational';
  pageContext: PageContext | null;
  selectedModel: string;
  fontFamily: string;
  fontSize: number;
  chatInterfaceRef?: React.RefObject<any>;
  onMessageUpdate?: (messageId: string, updatedMessage: Partial<Message>) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  error,
  mode,
  pageContext,
  selectedModel,
  fontFamily,
  fontSize,
  chatInterfaceRef,
  onMessageUpdate,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const defaultLanguage = useStorage(defaultLanguageStorage);
  const { updateMessage, deleteMessage } = useChat();
  const [renderedMessages, setRenderedMessages] = useState<Message[]>([]);

  // Update translations when language changes
  useEffect(() => {
    if (defaultLanguage) {
      // @ts-expect-error - DevLocale type not available from @extension/i18n
      t.devLocale = defaultLanguage;
      console.log('MessageList: Language set to', defaultLanguage);
    }
  }, [defaultLanguage]);

  // Use only the context state as the single source of truth
  const { state } = useChat();

  // Keep renderedMessages in sync with context messages
  // Also filter out any deleted messages
  useEffect(() => {
    // Filter out deleted messages from context state
    const filteredMessages = state.messages.filter(msg => !msg.metadata?.isDeleted);

    // Sort messages by timestamp to maintain order
    filteredMessages.sort((a, b) => {
      const timestampA = a.metadata?.timestamp || 0;
      const timestampB = b.metadata?.timestamp || 0;
      return timestampA - timestampB;
    });

    setRenderedMessages(filteredMessages);

    // Log for debugging
    console.log('MessageList: Using context messages:', filteredMessages.length);
  }, [state.messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [renderedMessages]);

  // Handle message updates - use the context directly
  const handleMessageUpdate = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      // Handle special case for deletion
      if (updates.metadata?.isDeleted) {
        console.log(`Message ${messageId} marked as deleted, removing from UI`);

        // Delete using context for global state update
        deleteMessage(messageId);

        return;
      }

      // Update using context for global state update
      updateMessage(messageId, updates);
    },
    [updateMessage, deleteMessage],
  );

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 max-w-full scrollbar-thin scrollbar-thumb-muted-foreground/30 bg-background text-foreground">
      {renderedMessages.length === 0 && (
        <div className="flex items-center justify-center h-full opacity-70">
          <div className="text-center p-4 bg-muted/20 border border-border rounded-lg max-w-sm">
            <h3 className="font-medium mb-2">{t('sidepanel_welcome_title', 'Welcome to Overlay')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('sidepanel_welcome_message', 'Start a conversation or ask a question about the current page.')}
            </p>
          </div>
        </div>
      )}
      {renderedMessages
        .filter(message => !message.metadata?.isDeleted) // Double-check deletion filter
        .map((message, index) => {
          // Ensure we have a stable ID for updates
          const messageId = message.id || `msg-${message.metadata?.timestamp || index}`;
          // For debugging
          if (!message.id && message.role === 'system') {
            console.log('Message without ID in MessageList:', messageId, message.content.substring(0, 20));
          }

          return (
            <MessageItem
              key={messageId}
              message={{
                ...message,
                id: messageId, // Ensure ID is set for the component
              }}
              index={index}
              mode={mode}
              pageContext={pageContext}
              selectedModel={selectedModel}
              fontFamily={fontFamily}
              fontSize={fontSize}
              chatInterfaceRef={chatInterfaceRef}
              onUpdate={updates => handleMessageUpdate(messageId, updates)}
            />
          );
        })}
      {isLoading && <LoadingMessage />}
      {error && <ErrorMessage error={error} />}
      <div ref={messagesEndRef} />
    </div>
  );
};
