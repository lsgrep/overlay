// import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense, ModelService } from '@extension/shared';
import { overlayApi } from '@extension/shared/lib/services/api';
import { saveNote, deleteNote } from '@extension/shared/lib/services/supabase';
import { exampleThemeStorage, defaultModelStorage, defaultLanguageStorage } from '@extension/storage';
import { Label, ToggleGroup, ToggleGroupItem } from '@extension/ui';
import { MessageCircle, Blocks } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { t } from '@extension/i18n';

import { CONTEXT_MENU_ACTIONS } from './types/chat';
import { ChatInterface } from './ChatInterface';
import type { Message as ChatMessage } from './ChatInterface';
import { ModelSelector } from './components/ModelSelector';
import { Toaster } from '@extension/ui/lib/ui/sonner';
import type { SystemMessageType } from './components/SystemMessageView';

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const defaultLanguage = useStorage(defaultLanguageStorage);
  const isLight = theme === 'light';
  // Define model types
  type ModelType = { name: string; displayName?: string; provider: string };
  const [ollamaModels, setOllamaModels] = useState<ModelType[]>([]);
  const [geminiModels, setGeminiModels] = useState<ModelType[]>([]);
  const [anthropicModels, setAnthropicModels] = useState<ModelType[]>([]);
  const [openaiModels, setOpenAIModels] = useState<Array<{ name: string; displayName?: string; provider: string }>>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'interactive' | 'conversational'>('conversational');
  const [input, setInput] = useState('');
  // Reference to ChatInterface methods
  const chatInterfaceRef = useRef<{
    submitMessage: (text: string, includePageContext?: boolean) => Promise<void>;
    addSystemMessage: (message: ChatMessage) => number | undefined;
    updateSystemMessage: (messageId: number, updatedMessage: Partial<ChatMessage>) => void;
  } | null>(null);

  // We'll use Chrome's native notifications instead of custom UI notifications

  // Update translations when language changes
  useEffect(() => {
    if (defaultLanguage) {
      // Set the locale directly from storage
      // @ts-expect-error - DevLocale type not available from @extension/i18n
      t.devLocale = defaultLanguage;
      console.log('SidePanel: Language set to', defaultLanguage);
    }
  }, [defaultLanguage]);

  // Function to show Chrome notifications
  const showNotification = (message: string, type: 'success' | 'error') => {
    // Create a unique ID for the notification
    const notificationId = `overlay-note-${Date.now()}`;

    // Set notification options
    const options = {
      type: 'basic' as chrome.notifications.TemplateType,
      iconUrl: chrome.runtime.getURL('icon-128.png'),
      title: type === 'success' ? 'Note saved' : 'Error',
      message: message,
      priority: 2,
      requireInteraction: false,
    };

    // Show the notification
    chrome.notifications.create(notificationId, options);

    // Auto-clear notification after 5 seconds
    setTimeout(() => {
      chrome.notifications.clear(notificationId);
    }, 5000);
  };

  // Load default model from storage
  useEffect(() => {
    const loadDefaultModel = async () => {
      const defaultModel = await defaultModelStorage.get();
      if (defaultModel) {
        setSelectedModel(defaultModel);
      }
    };
    loadDefaultModel();
  }, []);

  // Save selected model to storage when it changes
  useEffect(() => {
    if (selectedModel) {
      defaultModelStorage.set(selectedModel);
    }
  }, [selectedModel]);

  // Helper function to log both to console and UI
  // Listen for messages
  useEffect(() => {
    const handleMessage = async (message: { type: string; text?: string; actionId?: string; url?: string }) => {
      console.log('Debug: Received message:', message);
      if (!selectedModel) {
        console.log('Debug: No model selected, ignoring message');
        return;
      }

      if (message.type === 'CONTEXT_MENU_ACTION' && message.actionId) {
        console.log('Debug: Processing context menu action:', message.actionId);
        const action = CONTEXT_MENU_ACTIONS.find(a => a.id === message.actionId);
        console.log('Debug: Found action:', action);

        if (action) {
          try {
            // Handle the 'take-note' action differently
            if (action.id === 'take-note' && message.text) {
              const sourceUrl = message.url || 'Unknown source';
              // Add loading system message to the chat first
              let messageId: number | undefined;
              if (chatInterfaceRef.current) {
                const loadingMessage = {
                  role: 'system',
                  content: `🔄 Saving note: "${message.text}"...`,
                  model: {
                    name: 'Overlay',
                    provider: 'overlay',
                  },
                  metadata: {
                    timestamp: Date.now(),
                    sourceUrl: sourceUrl,
                  },
                };
                // Add the loading system message and store its ID
                messageId = chatInterfaceRef.current.addSystemMessage(loadingMessage);
              }
              // Save the note
              const result = await saveNote(message.text, sourceUrl);

              // Send result back to content script for toast notification
              try {
                // Get the active tab to send message back to content script
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                const activeTab = tabs[0];
                if (activeTab && activeTab.id) {
                  await chrome.tabs.sendMessage(activeTab.id, {
                    type: 'NOTE_SAVE_RESULT',
                    success: result.success,
                    error: result.error,
                  });
                  console.log('[SidePanel] Sent note save result to content script');
                }
              } catch (msgError) {
                console.error('[SidePanel] Error sending message to content script:', msgError);
              }

              // Also show notification in side panel
              if (result.success) {
                console.log('[SidePanel] Note saved successfully');
                // Show success notification
                showNotification('Note saved: Your note has been saved successfully.', 'success');
                // Update the system message to show success
                if (chatInterfaceRef.current && messageId) {
                  // Check if we have a note ID from the save result
                  const noteId = result.data?.[0]?.id;

                  const updatedMessage = {
                    content: message.text,
                    metadata: {
                      systemMessageType: 'note' as SystemMessageType,
                      id: noteId, // Save the note ID for later updates/deletion
                    },
                  };
                  chatInterfaceRef.current.updateSystemMessage(messageId, updatedMessage);
                }
              } else {
                console.error('[SidePanel] Failed to save note:', result.error);
                // Show error notification
                showNotification(
                  `Failed to save note: ${result.error || 'An error occurred while saving your note.'}`,
                  'error',
                );
                // Update the system message to show error
                if (chatInterfaceRef.current && messageId) {
                  const updatedMessage = {
                    content: `Failed to save note: "${message.text}"`,
                    metadata: {
                      systemMessageType: 'error' as SystemMessageType,
                    },
                  };
                  chatInterfaceRef.current.updateSystemMessage(messageId, updatedMessage);
                }
              }
            }
            // Handle the 'create-todo' action to create a task
            else if (action.id === 'create-todo' && message.text) {
              const sourceUrl = message.url || 'Unknown source';
              // Add loading system message to the chat first
              let messageId: number | undefined;
              if (chatInterfaceRef.current) {
                const loadingMessage = {
                  role: 'system',
                  content: `🔄 Creating task: "${message.text}"...`,
                  model: {
                    name: 'Overlay',
                    provider: 'overlay',
                  },
                  metadata: {
                    timestamp: Date.now(),
                    sourceUrl: sourceUrl,
                  },
                };
                // Add the loading system message and store its ID
                messageId = chatInterfaceRef.current.addSystemMessage(loadingMessage);
              }
              try {
                // Check if user is authenticated
                const isAuthenticated = await overlayApi.isAuthenticated();
                if (!isAuthenticated) {
                  showNotification('You need to be signed in to create tasks.', 'error');

                  // Send result back to content script for toast notification
                  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                  const activeTab = tabs[0];
                  if (activeTab && activeTab.id) {
                    await chrome.tabs.sendMessage(activeTab.id, {
                      type: 'TODO_CREATE_RESULT',
                      success: false,
                      error: 'Authentication required. Please sign in first.',
                    });
                  }
                  // Update the system message to show authentication error
                  if (chatInterfaceRef.current && messageId) {
                    const updatedMessage = {
                      content: `Authentication required. Please sign in first.`,
                      metadata: {
                        systemMessageType: 'error' as SystemMessageType,
                      },
                    };
                    chatInterfaceRef.current.updateSystemMessage(messageId, updatedMessage);
                  }
                  return;
                }

                // Create a task using the selected text as title
                await overlayApi.createTask({
                  title: message.text,
                  notes: `Created from: ${sourceUrl}`,
                });

                console.log('[SidePanel] Todo created successfully');
                // Show success notification in side panel
                showNotification('Todo created successfully.', 'success');

                // Send success notification to content script
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                const activeTab = tabs[0];
                if (activeTab && activeTab.id) {
                  await chrome.tabs.sendMessage(activeTab.id, {
                    type: 'TODO_CREATE_RESULT',
                    success: true,
                  });
                  console.log('[SidePanel] Sent todo creation result to content script');
                }
                // Update the system message to show success
                if (chatInterfaceRef.current && messageId) {
                  const updatedMessage = {
                    content: message.text,
                    metadata: {
                      systemMessageType: 'task' as SystemMessageType,
                      id: `task-${Date.now()}`,
                      notes: `Created from: ${sourceUrl}`,
                      completed: false,
                    },
                  };
                  chatInterfaceRef.current.updateSystemMessage(messageId, updatedMessage);
                }
              } catch (error) {
                console.error('[SidePanel] Failed to create todo:', error);
                // Show error notification
                const errorMessage = error instanceof Error ? error.message : 'An error occurred';
                showNotification(`Failed to create todo: ${errorMessage}`, 'error');

                // Send error notification to content script
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                const activeTab = tabs[0];
                if (activeTab && activeTab.id) {
                  await chrome.tabs.sendMessage(activeTab.id, {
                    type: 'TODO_CREATE_RESULT',
                    success: false,
                    error: errorMessage,
                  });
                }
                // Update the system message to show error
                if (chatInterfaceRef.current && messageId) {
                  const updatedMessage = {
                    content: `Failed to create task: "${message.text}"`,
                    metadata: {
                      systemMessageType: 'error' as SystemMessageType,
                    },
                  };
                  chatInterfaceRef.current.updateSystemMessage(messageId, updatedMessage);
                }
              }
            } else {
              // Handle other actions as before
              if (message.text) {
                const chatInput = await action.prompt(message.text);
                if (chatInput) {
                  console.log('Debug: Processing chat input:', chatInput);
                  // Add to message history and trigger LLM call if chatInterfaceRef is available
                  if (chatInterfaceRef.current) {
                    // For selection popup actions, don't include page context (false parameter)
                    // Only note creation should include page context, which is handled separately above
                    console.log('Debug: Submitting selection popup message without page context');
                    chatInterfaceRef.current.submitMessage(chatInput, false);
                  } else {
                    // Fallback to old behavior if ref isn't available
                    console.log('Debug: ChatInterface ref not available, setting input text only');
                    setInput(chatInput);
                  }
                }
              } else {
                console.warn('Debug: No text provided for action:', action.id);
              }
            }
          } catch (error) {
            console.error('Error handling action:', error);
            console.error('[SidePanel] Error:', (error as Error).message);
            // Show error notification
            showNotification(`Error: ${(error as Error).message || 'An error occurred.'}`, 'error');
          }
        }
      }
    };

    const listener = (
      message: { type: string; text?: string; actionId?: string; url?: string },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _sender: chrome.runtime.MessageSender,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _sendResponse: (response?: unknown) => void,
    ) => {
      console.log('Debug: Message listener called with:', message);
      handleMessage(message).catch(error => {
        console.error('Error handling message:', error);
      });
      // Return true to indicate we want to keep the message channel open for async response
      return true;
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [selectedModel]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        setError('');

        const { anthropic, ollama, gemini, openai } = await ModelService.fetchAllModels();
        setAnthropicModels(anthropic);
        setOllamaModels(ollama);
        setGeminiModels(gemini);
        setOpenAIModels(openai);
      } catch (err) {
        console.error('Error fetching models:', err);
        setError('Failed to fetch models: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  // We're using Chrome's native notifications instead of a custom component

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="p-4 border-b border-border">
        <div className="flex flex-col gap-4">
          <ModelSelector
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            openaiModels={openaiModels}
            geminiModels={geminiModels}
            ollamaModels={ollamaModels}
            anthropicModels={anthropicModels}
            // @ts-expect-error - isLoading and error will be added to ModelSelectorProps in a future PR
            isLoading={loading}
            error={error}
          />
          <div className="flex items-center gap-4">
            <Label htmlFor="mode-selector" className="min-w-16">
              {t('sidepanel_mode')}
            </Label>
            <ToggleGroup
              id="mode-selector"
              type="single"
              value={mode}
              onValueChange={(value: string) => value && setMode(value as 'conversational' | 'interactive')}
              className="flex-1">
              <ToggleGroupItem value="conversational" className="flex-1">
                <MessageCircle className="mr-2" />
                {t('sidepanel_conversational_mode')}
              </ToggleGroupItem>
              <ToggleGroupItem value="interactive" className="flex-1">
                <Blocks className="mr-2" />
                {t('sidepanel_interactive_mode')}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ChatInterface
          ref={chatInterfaceRef}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          isLight={isLight}
          mode={mode}
          initialInput={input}
          openaiModels={openaiModels}
          geminiModels={geminiModels}
          ollamaModels={ollamaModels}
          anthropicModels={anthropicModels}
          isLoadingModels={loading}
          modelError={error}
        />
      </div>
      <Toaster />
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(
    SidePanel,
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>,
  ),
  <div className="p-4 text-destructive">An error occurred</div>,
);
