import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useStorage } from '@extension/shared';
import { fontFamilyStorage, fontSizeStorage, defaultLanguageStorage } from '@extension/storage';
import { t } from '@extension/i18n';

// Import our refactored components
import { HeaderComponent } from './components/HeaderComponent';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { ChatService } from './services/ChatService';
import type { PageContext } from './services/llm/prompts';

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
    extractedData?: unknown;
    timestamp?: number;
  };
}

interface ChatInterfaceProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isLight: boolean;
  mode: 'interactive' | 'conversational';
  initialInput?: string;
  openaiModels: Array<{ name: string; displayName?: string; provider: string }>;
  geminiModels: Array<{ name: string; displayName?: string; provider: string }>;
  ollamaModels: Array<{ name: string; displayName?: string; provider: string }>;
  anthropicModels: Array<{ name: string; displayName?: string; provider: string }>;
  isLoadingModels?: boolean;
  modelError?: string | null;
}

export const ChatInterface = forwardRef<{ submitMessage: (text: string) => Promise<void> }, ChatInterfaceProps>(
  (props, ref) => {
    const {
      selectedModel,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      setSelectedModel,
      isLight,
      mode,
      initialInput,
      openaiModels,
      geminiModels,
      ollamaModels,
      anthropicModels,
      // Unused properties intentionally omitted:
      // isLoadingModels,
      // modelError
    } = props;

    const fontFamily = useStorage(fontFamilyStorage);
    const fontSize = useStorage(fontSizeStorage);
    const defaultLanguage = useStorage(defaultLanguageStorage);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState(initialInput || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pageContext, setPageContext] = useState<PageContext | null>(null);

    // Update translations when language changes
    useEffect(() => {
      if (defaultLanguage) {
        // @ts-expect-error - DevLocale type not available from @extension/i18n
        t.devLocale = defaultLanguage;
        console.log('ChatInterface: Language set to', defaultLanguage);
      }
    }, [defaultLanguage]);

    // Process initialInput if provided
    useEffect(() => {
      if (initialInput && !isLoading) {
        console.log('Debug: Setting input from initialInput:', initialInput);
        setInput(initialInput);
      }
    }, [initialInput, isLoading]);

    // Function to submit a message programmatically (without a form event)
    const submitMessageProgrammatically = async (messageText: string) => {
      if (!messageText.trim() || isLoading) return;

      // Create the display message
      const displayMessage: Message = { role: 'user', content: messageText };
      setMessages(prev => [...prev, displayMessage]);
      setIsLoading(true);
      setError(null);

      try {
        // Extract page context
        const extractedPageContext = await ChatService.extractPageContent();
        setPageContext(extractedPageContext);

        // Submit message to ChatService
        const { response, model, questionId } = await ChatService.submitMessage({
          input: displayMessage.content,
          selectedModel,
          mode,
          pageContext: extractedPageContext,
          messages,
          openaiModels,
          geminiModels,
          anthropicModels,
          ollamaModels,
          defaultLanguage: defaultLanguage || 'en',
        });

        // Add response to messages
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: response,
            model,
            metadata: {
              questionId,
              originalQuestion: displayMessage.content,
              timestamp: Date.now(),
            },
          },
        ]);
      } catch (err) {
        console.error('Error in chat:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      submitMessage: submitMessageProgrammatically,
    }));

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      // Reuse the submitMessage functionality
      await submitMessageProgrammatically(input);
      setInput('');
    };

    return (
      <div className="flex flex-col h-full" style={{ fontFamily, fontSize: `${Number(fontSize)}px` }}>
        {/* @ts-expect-error - HeaderComponent props types will be fixed in a separate PR */}
        <HeaderComponent fontFamily={fontFamily} fontSize={Number(fontSize)} />

        <MessageList
          messages={messages}
          isLoading={isLoading}
          error={error}
          mode={mode}
          isLight={isLight}
          pageContext={pageContext}
          selectedModel={selectedModel}
          fontFamily={fontFamily}
          fontSize={Number(fontSize)}
        />

        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          fontFamily={fontFamily}
          fontSize={Number(fontSize)}
        />
      </div>
    );
  },
);
