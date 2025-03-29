import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useStorage } from '@extension/shared';
import { fontFamilyStorage, fontSizeStorage, defaultLanguageStorage } from '@extension/storage';
import { t } from '@extension/i18n';
import { saveCompletion } from '@extension/shared/lib/services/supabase';
import { overlayApi, type Task } from '@extension/shared/lib/services/api';
import type { SystemMessageType } from './components/SystemMessageView';

// Import our refactored components
import { HeaderComponent } from './components/HeaderComponent';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { ChatService } from './services/ChatService';
import type { PageContext } from './services/llm/prompts';
import type { MessageImage } from './services/llm/types';

// We're using the Task interface directly from the API module

export interface Message {
  role: string;
  content: string;
  images?: MessageImage[];
  model?: {
    name: string;
    displayName?: string;
    provider: string;
  };
  metadata?: {
    questionId?: string;
    originalQuestion?: string;
    extractedData?: Record<string, unknown>;
    timestamp?: number;
    sourceUrl?: string;
    isTaskList?: boolean; // Indicate if this message contains tasks
    tasks?: Task[]; // Array of task items if this is a task message
    systemMessageType?: SystemMessageType; // Type of system message for rendering
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

export const ChatInterface = forwardRef<
  {
    submitMessage: (text: string, includePageContext?: boolean) => Promise<void>;
    addSystemMessage: (message: Message) => number | undefined;
    updateSystemMessage: (messageId: number, updatedMessage: Partial<Message>) => void;
  },
  ChatInterfaceProps
>((props, ref) => {
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
  const [draggedImages, setDraggedImages] = useState<Array<{ url: string; altText?: string }>>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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
  // includePageContext defaults to true for normal chat inputs, but can be set to false for selection popup actions
  const submitMessageProgrammatically = async (messageText: string, includePageContext = true) => {
    if (!messageText.trim() || isLoading) return;

    // Extract page context first so we can get the URL and avoid calling the method twice
    let extractedPageContext: PageContext | null = null;
    try {
      // Always extract page context to get the URL, even if we don't use it for the API call
      extractedPageContext = await ChatService.extractPageContent();
    } catch (err) {
      console.error('Error extracting page context:', err);
    }

    // Log if we have images to send
    if (draggedImages.length > 0) {
      console.log(`Sending ${draggedImages.length} images with message to Gemini:`, draggedImages);
    }

    // Get the active tab URL and title from the extracted context
    const activeTabUrl = extractedPageContext?.url || ''; // Fallback to empty string if undefined
    const activeTabTitle = extractedPageContext?.title || ''; // Fallback to empty string if undefined

    // Create the display message
    const displayMessage: Message = {
      role: 'user',
      content: messageText,
      metadata: {
        timestamp: Date.now(),
        // Always use active page URL for all user messages
        sourceUrl: activeTabUrl,
      },
    };

    // Add images to the message if available
    if (draggedImages.length > 0) {
      displayMessage.images = draggedImages;
    }
    setMessages(prev => [...prev, displayMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Use the previously extracted page context if includePageContext is true
      if (includePageContext && extractedPageContext) {
        setPageContext(extractedPageContext);
      }

      // Submit message to ChatService
      const { response, model, questionId } = await ChatService.submitMessage({
        input: displayMessage.content,
        selectedModel,
        mode,
        // @ts-expect-error - ChatService should handle null pageContext
        pageContext: includePageContext ? extractedPageContext : null,
        messages,
        // Pass images to the service if available
        images: draggedImages,
        openaiModels,
        geminiModels,
        anthropicModels,
        ollamaModels,
        defaultLanguage: defaultLanguage || 'en',
      });

      // Add response to messages
      const responseTimestamp = Date.now();
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response,
          model,
          metadata: {
            questionId,
            originalQuestion: displayMessage.content,
            timestamp: responseTimestamp,
            // Don't add sourceUrl to LLM responses as requested
          },
        },
      ]);

      // Save completion to Supabase
      try {
        await saveCompletion({
          promptContent: displayMessage.content,
          responseContent: response,
          sourceUrl: activeTabUrl,
          questionId,
          modelInfo: {
            modelName: model.name,
            modelProvider: model.provider,
            modelDisplayName: model.displayName,
          },
          metadata: {
            mode,
            promptTimestamp: displayMessage.metadata?.timestamp,
            responseTimestamp,
            pageContextIncluded: !!includePageContext,
            pageTitle: activeTabTitle, // Add page title to metadata
          },
        });
        console.log('Completion saved to database');
      } catch (saveError) {
        // Don't break the chat flow if saving fails
        console.error('Error saving completion to database:', saveError);
      }
    } catch (err) {
      console.error('Error in chat:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
      // Clear the draggedImages after sending the message
      setDraggedImages([]);
    }
  };

  // Function to add a system message directly to the chat
  const addSystemMessageToChat = (message: Message) => {
    // Ensure we have a timestamp for identification
    if (!message.metadata) {
      message.metadata = { timestamp: Date.now() };
    } else if (!message.metadata.timestamp) {
      message.metadata.timestamp = Date.now();
    }

    // Ensure the role is set to 'system'
    message.role = 'system';

    // If systemMessageType is not set and this is a system message, default to 'info'
    if (message.role === 'system' && !message.metadata.systemMessageType) {
      message.metadata.systemMessageType = 'info';
    }

    setMessages(prev => [...prev, message]);
    return message.metadata.timestamp; // Return timestamp to be used as an identifier
  };

  // Function to update an existing system message by its timestamp
  const updateSystemMessageInChat = (messageId: number, updatedMessage: Partial<Message>) => {
    setMessages(prev =>
      prev.map(msg => {
        // Find the message with the matching timestamp and update it
        if (msg.metadata?.timestamp === messageId) {
          return { ...msg, ...updatedMessage };
        }
        return msg;
      }),
    );
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    submitMessage: (text: string, includePageContext = false) =>
      submitMessageProgrammatically(text, includePageContext),
    addSystemMessage: (message: Message) => addSystemMessageToChat(message),
    updateSystemMessage: (messageId: number, updatedMessage: Partial<Message>) =>
      updateSystemMessageInChat(messageId, updatedMessage),
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const inputTrimmed = input.trim();
    // Check for /tasks command
    if (inputTrimmed === '/tasks') {
      setIsLoading(true);
      try {
        // Get tasks from API
        const tasks: Task[] = await overlayApi.getTasks();

        // Create a formatted tasks message using checkbox markdown syntax
        // This serves as fallback content for clients that don't support our enhanced UI
        let tasksContent = '### Your Tasks\n\n';
        if (tasks.length === 0) {
          tasksContent += 'You have no tasks in your list.';
        } else {
          tasks.forEach(task => {
            // Use checkbox markdown syntax: - [ ] or - [x]
            const checkboxStatus = task.status === 'completed' ? '[x]' : '[ ]';
            const dueDate = task.due ? ` (Due: ${overlayApi.formatDate(task.due)})` : '';
            tasksContent += `- ${checkboxStatus} ${task.title}${dueDate}\n`;
          });
        }
        // Add a system message with the tasks
        setMessages(prev => [
          ...prev,
          {
            role: 'user',
            content: input,
            metadata: {
              timestamp: Date.now(),
            },
          },
          {
            role: 'assistant',
            content: tasksContent,
            model: {
              name: 'Tasks',
              provider: 'overlay',
            },
            metadata: {
              timestamp: Date.now(),
              isTaskList: tasks.length > 0,
              tasks: tasks,
            },
          },
        ]);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setMessages(prev => [
          ...prev,
          {
            role: 'user',
            content: input,
            metadata: {
              timestamp: Date.now(),
            },
          },
          {
            role: 'assistant',
            content: 'Error fetching tasks. Please make sure you are authenticated.',
            model: {
              name: 'system',
              provider: 'overlay',
            },
            metadata: {
              timestamp: Date.now(),
              isTaskList: false, // No tasks to display
            },
          },
        ]);
      } finally {
        setIsLoading(false);
        setInput('');
      }
    } else {
      // Normal message handling
      await submitMessageProgrammatically(input, true);
      setInput('');
    }
  };

  // Drag and drop handlers for the entire side panel
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    // Log all available data formats
    console.log('Available data formats:');
    for (let i = 0; i < e.dataTransfer.types.length; i++) {
      console.log(`- ${e.dataTransfer.types[i]}`);
    }
    const imageUrl =
      e.dataTransfer.getData('text/uri-list') ||
      e.dataTransfer.getData('overlay/image') ||
      e.dataTransfer.getData('text/plain');
    console.log('Detected image URL:', imageUrl);

    // Handle file drops (actual image files)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Process each dropped file
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = event => {
            if (event.target && event.target.result) {
              const dataUrl = event.target.result.toString();
              console.log('Processed image file to data URL');
              setDraggedImages(prev => [...prev, { url: dataUrl }]);
              // Don't add markdown to input text, just add to draggedImages array
              console.log('Image added to draggedImages from file upload');
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
    // Handle image URL drops
    else if (imageUrl && isValidImageUrl(imageUrl)) {
      console.log('Adding valid image URL to state:', imageUrl);
      setDraggedImages(prev => [...prev, { url: imageUrl }]);
      // Don't add markdown to input text, just add to draggedImages array
      console.log('Image added to draggedImages from URL drop');
    }
  };

  // Helper function to check if a URL points to an image
  const isValidImageUrl = (url: string): boolean => {
    // Simple validation to check if it's a URL and likely an image
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    // Check if it's a URL format and has image extension or common image hosting domains
    const isUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/');
    const hasImageExtension = imageExtensions.some(ext => url.toLowerCase().includes(ext));
    const isImageHostingUrl = url.includes('imgur.com') || url.includes('ibb.co') || url.includes('twimg.com');

    return isUrl && (hasImageExtension || isImageHostingUrl || url.startsWith('data:image/'));
  };

  return (
    <div
      className={`flex flex-col h-full ${isDraggingOver ? 'bg-primary/10' : ''}`}
      style={{ fontFamily, fontSize: `${Number(fontSize)}px` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}>
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
        draggedImages={draggedImages}
        setDraggedImages={setDraggedImages}
      />
    </div>
  );
});
