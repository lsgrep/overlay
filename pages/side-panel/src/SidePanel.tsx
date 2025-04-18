// import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense, ModelService } from '@extension/shared';
import { overlayApi, type Task } from '@extension/shared/lib/services/api';
import {
  saveNote,
  deleteNote,
  createClient,
  signInWithProvider,
  signOut,
  getCurrentUserFromStorage,
} from '@extension/shared/lib/services/supabase';
import { exampleThemeStorage, defaultModelStorage } from '@extension/storage';
import { Label, ToggleGroup, ToggleGroupItem } from '@extension/ui';
import { MessageCircle, Blocks } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { t } from '@extension/i18n';
import { useChat } from './contexts/ChatContext';
import { motion } from 'framer-motion';

import { CONTEXT_MENU_ACTIONS } from './types/chat';
import { ChatInterface } from './ChatInterface';
import type { Message as ChatMessage } from './ChatInterface';
import { Toaster } from '@extension/ui/lib/ui/sonner';
import type { SystemMessageType } from './components/SystemMessageView';

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
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
  const [user, setUser] = useState<{
    id: string;
    email?: string;
    user_metadata?: {
      avatar_url?: string;
      full_name?: string;
      [key: string]: unknown;
    };
  } | null>(null);
  // Get chat context for direct manipulation
  const { addMessage } = useChat();
  // Reference to ChatInterface methods
  const chatInterfaceRef = useRef<{
    submitMessage: (text: string, includePageContext?: boolean) => Promise<void>;
    addSystemMessage: (message: ChatMessage) => number | undefined;
    updateSystemMessage: (messageId: number, updatedMessage: Partial<ChatMessage>) => void;
  } | null>(null);
  const supabase = createClient();
  useEffect(() => {
    async function getUser() {
      try {
        console.log('[CHAT] Getting user...');
        // First try to get user from current session
        const {
          data: { user },
        } = await supabase.auth.getUser();
        console.log('[CHAT] getUser: User from session', user);

        if (user) {
          setUser(user);
          console.log('[CHAT] User set from session', user.email);
        } else {
          console.log('[CHAT] No user in session, trying storage');
          // If no session, try to get user from storage tokens
          const storageUser = await getCurrentUserFromStorage();
          if (storageUser) {
            setUser(storageUser);
            console.log('[CHAT] User set from storage', storageUser.email);
          } else {
            console.log('[CHAT] No user found in storage');
          }
        }
      } catch (error) {
        console.error('[CHAT] Error getting user:', error);
      } finally {
        // Complete
      }

      // Set up auth state change listener
      const {
        data: { subscription },
      } = await supabase.auth.onAuthStateChange((event, session) => {
        console.log('[CHAT] Auth state changed:', event, session?.user?.email);
        setUser(session?.user ?? null);
      });

      // Clean up subscription on unmount
      return () => {
        console.log('[CHAT] Cleaning up auth subscription');
        subscription.unsubscribe();
      };
    }

    const handleAuthComplete = (message: { action: string; payload: { success: boolean } }) => {
      console.log('[CHAT] Received message:', message);
      if (message.action === 'authComplete' && message.payload.success) {
        console.log('[CHAT] Auth complete message received, refreshing user');
        // Refresh user data
        getUser();
      }
    };

    if (chrome?.runtime?.onMessage) {
      console.log('[CHAT] Setting up message listener');
      chrome.runtime.onMessage.addListener(handleAuthComplete);
      // Initial user fetch
      console.log('[CHAT] Initial user fetch');
      getUser();
      return () => {
        console.log('[CHAT] Removing message listener');
        chrome.runtime.onMessage.removeListener(handleAuthComplete);
      };
    } else {
      console.log('[CHAT] Chrome runtime not available, fetching user directly');
      getUser();
    }
  }, [supabase]);

  // Apply theme class to document element
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (theme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [theme]);

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
        // need to show a system message here to let user know that it is broken
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
                // Update the system message to show success
                if (chatInterfaceRef.current && messageId) {
                  // Check if we have a note ID from the save result
                  const noteId = result.data?.[0]?.id;

                  const updatedMessage = {
                    content: message.text,
                    metadata: {
                      systemMessageType: 'note' as SystemMessageType,
                      id: noteId, // Save the note ID for later updates/deletion
                      sourceUrl: sourceUrl, // Include the source URL for display in the note
                    },
                  };

                  // Update through ChatInterface ref (local state)
                  chatInterfaceRef.current.updateSystemMessage(messageId, updatedMessage);

                  // Also update through context (global state)
                  // Find message by timestamp in global state
                  const globalMessage = {
                    id: `system-note-${noteId}`, // More descriptive message ID for debugging
                    role: 'system',
                    content: message.text,
                    metadata: {
                      systemMessageType: 'note' as SystemMessageType,
                      id: noteId,
                      sourceUrl: sourceUrl,
                      timestamp: messageId,
                    },
                  };

                  // Add to global context and log for debugging
                  console.log('Adding note to global context:', globalMessage.id, 'with noteId:', noteId);
                  addMessage(globalMessage);
                }
              } else {
                console.error('[SidePanel] Failed to save note:', result.error);
                // Update the system message to show error
                if (chatInterfaceRef.current && messageId) {
                  const updatedMessage = {
                    content: t('note_save_failed_message', 'Failed to save note: "{text}"', { text: message.text }),
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
                  // Also show a more prominent Chrome notification
                  chrome.notifications.create({
                    type: 'basic',
                    iconUrl: '/icon-128.png',
                    title: 'Authentication Required',
                    message: 'Please sign in to create tasks.',
                    priority: 2,
                  });

                  // Try to send result back to content script for toast notification
                  try {
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    const activeTab = tabs[0];
                    if (activeTab && activeTab.id) {
                      await chrome.tabs.sendMessage(activeTab.id, {
                        type: 'TODO_CREATE_RESULT',
                        success: false,
                        error: 'Authentication required. Please sign in first.',
                      });
                      console.log('Authentication required message sent to content script');
                    } else {
                      console.warn('No active tab found to send notification');
                    }
                  } catch (err) {
                    console.error('Failed to send message to content script:', err);
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

                // Create a task using the selected text as title and get the created task data
                const createdTask = await overlayApi.createTask({
                  title: message.text,
                  notes: `Created from: ${sourceUrl}`,
                });

                // Extract task ID from the response - Google Tasks returns nested task object
                // Prepare for both formats: direct task object or nested {task: {...}} format
                const taskObject = 'task' in createdTask ? (createdTask.task as Task) : createdTask;
                const taskId = taskObject.id;

                console.log('[SidePanel] Todo created successfully:', taskObject);
                console.log('[SidePanel] Using task ID:', taskId);

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
                      id: taskId, // Use the extracted task ID
                      notes: `Created from: ${sourceUrl}`,
                      completed: false,
                    },
                  };

                  // Update through ChatInterface ref (local state)
                  chatInterfaceRef.current.updateSystemMessage(messageId, updatedMessage);

                  // Also update through context (global state)
                  const globalMessage = {
                    id: `system-task-${taskId}`, // More descriptive message ID using correct task ID
                    role: 'system',
                    content: message.text,
                    metadata: {
                      systemMessageType: 'task' as SystemMessageType,
                      id: taskId, // Use the extracted task ID
                      notes: `Created from: ${sourceUrl}`,
                      completed: false,
                      sourceUrl: sourceUrl,
                      timestamp: messageId,
                    },
                  };

                  // Add to global context and log for debugging
                  console.log('Adding task to global context:', globalMessage.id, 'with taskId:', taskId);
                  addMessage(globalMessage);
                }
              } catch (error) {
                if ((error as Error).message == 'Google account not connected') {
                  addMessage({
                    id: `system-error-${Date.now()}`,
                    role: 'system',
                    content:
                      'You need to connect to the Google account first. Go to [Overlay Dashboard Settings](https://overlay.one/en/dashboard/settings) to connect.',
                    metadata: {
                      systemMessageType: 'error' as SystemMessageType,
                    },
                  });
                  const errorMessage = error instanceof Error ? error.message : 'An error occurred';
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
              }
            } else {
              // Handle other actions as before
              if (message.text) {
                const chatInput = await action.prompt(message.text);
                if (chatInput) {
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
  }, [selectedModel, addMessage]);

  // Define a reusable function for fetching models
  const fetchModels = async () => {
    try {
      setLoading(true);
      setError('');

      const { anthropic, ollama, gemini, openai } = await ModelService.fetchAllModels();
      setAnthropicModels(anthropic);
      setOllamaModels(ollama);
      setGeminiModels(gemini);
      setOpenAIModels(openai);
      console.log('Models refreshed');
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Failed to fetch models: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Listen for API key changes to refresh models
  // Define authentication handler functions
  const handleSignIn = async () => {
    try {
      console.log('[CHAT] Initiating sign in with GitHub');
      await signInWithProvider('github');
    } catch (error) {
      console.error('[CHAT] Error signing in:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('[CHAT] Signing out');
      await signOut();
      setUser(null);
      console.log('[CHAT] Sign out complete, user cleared');
    } catch (error) {
      console.error('[CHAT] Error signing out:', error);
    }
  };

  useEffect(() => {
    fetchModels();

    // Function to handle storage changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      // Only care about changes in local storage where API keys are stored
      if (areaName !== 'local') return;

      // Log all changes to debug the issue
      console.log('Storage changes detected:', changes, 'in area:', areaName);

      // Storage keys to watch for API keys
      const apiKeyStorageNames = ['openai-api-key', 'gemini-api-key', 'anthropic-api-key'];

      // Check if any API key storage was changed
      const hasKeyChanges = Object.keys(changes).some(changeKey => {
        return apiKeyStorageNames.includes(changeKey);
      });

      if (hasKeyChanges) {
        console.log('API key changes detected, refreshing models...');
        // Use a short timeout to ensure the storage is fully updated
        setTimeout(() => {
          fetchModels();
        }, 100);
      }
    };

    // Add listener for storage changes
    chrome.storage.onChanged.addListener(handleStorageChange);
    console.log('Storage change listener registered for API keys');

    // Clean up listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // We're using Chrome's native notifications instead of a custom component

  useEffect(() => {
    // Apply theme class to the document element
    const htmlElement = document.documentElement;
    if (theme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="p-3 border-b border-border shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <motion.div
              className="min-w-16 flex items-center justify-center cursor-pointer"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              onClick={() => window.open('https://overlay.one', '_blank')}
              title={t('visit_overlay_website', 'Visit Overlay Website')}>
              <motion.img
                src={chrome.runtime.getURL('icon-128.png')}
                alt="Overlay"
                className="h-8 w-8"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
            <ToggleGroup
              id="mode-selector"
              type="single"
              value={mode}
              onValueChange={(value: string) => value && setMode(value as 'conversational' | 'interactive')}
              className="flex-1">
              <ToggleGroupItem value="conversational" className="flex-1 rounded-md">
                <MessageCircle className="mr-2 h-4 w-4" />
                {t('sidepanel_conversational_mode')}
              </ToggleGroupItem>
              <ToggleGroupItem value="interactive" className="flex-1 rounded-md relative">
                <Blocks className="mr-2 h-4 w-4" />
                <span className="flex items-center">
                  {t('sidepanel_interactive_mode')}
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary animate-pulse">
                    Beta
                  </span>
                </span>
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
          user={user}
          handleSignIn={handleSignIn}
          handleSignOut={handleSignOut}
        />
      </div>
      <Toaster theme={isLight ? 'light' : 'dark'} />
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
