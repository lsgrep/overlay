import { useEffect, useRef, useState } from 'react';
import { useStorage } from '@extension/shared';
import { fontFamilyStorage, fontSizeStorage, defaultLanguageStorage } from '@extension/storage';
import { PaperAirplaneIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { Terminal, UserCircle, LogOut, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { t } from '@extension/i18n';
import { TaskPlanView } from './components/TaskPlanView';
import { type TaskPlan } from './services/task/TaskExecutor';
import type { LLMService } from './services/llm/types';
import { PromptManager } from './services/llm/prompt';
import { GeminiService } from './services/llm/gemini';
import { OllamaService } from './services/llm/ollama';
import { AnthropicService } from './services/llm/anthropic';
import { OpenAIService } from './services/llm/openai';
import {
  Button,
  Textarea,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@extension/ui';
import { OpenAIIcon, GeminiIcon, OllamaIcon, AnthropicIcon } from '@extension/ui/lib/icons';
import icon from '../../../chrome-extension/public/icon-128.png';
import { PageContext } from './services/llm/prompts';
import {
  createClient,
  signInWithProvider,
  signOut,
  getCurrentUserFromStorage,
} from '@extension/shared/lib/services/supabase';

interface Message {
  role: string;
  content: string;
  model?: {
    name: string;
    displayName?: string;
    provider: string;
  };
  metadata?: {
    questionId?: string; // ID to link question-response pairs
    originalQuestion?: string; // The original question that led to this response
    extractedData?: any; // Any data extracted from the response
    timestamp?: number; // When the message was created
  };
}

interface TaskStep {
  description: string;
  action: 'click' | 'type' | 'navigate' | 'wait' | 'extract';
  target?: string;
  value?: string;
  selector?: string;
}

interface TaskPlan {
  goal: string;
  steps: TaskStep[];
  estimated_time: string;
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

const API_URL = 'http://localhost:11434/api/chat';

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedModel,
  setSelectedModel,
  isLight,
  mode,
  initialInput,
  openaiModels,
  geminiModels,
  ollamaModels,
  anthropicModels,
  isLoadingModels,
  modelError,
}) => {
  const supabase = createClient();
  const fontFamily = useStorage(fontFamilyStorage);
  const fontSize = useStorage(fontSizeStorage);
  const defaultLanguage = useStorage(defaultLanguageStorage);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Update translations when language changes
  useEffect(() => {
    if (defaultLanguage) {
      // Set the locale directly from storage - use string type for defaultLanguage
      // @ts-expect-error - DevLocale type not available from @extension/i18n
      t.devLocale = defaultLanguage;
      console.log('ChatInterface: Language set to', defaultLanguage);
    }
  }, [defaultLanguage]);

  // Listen for auth completion messages from background script
  useEffect(() => {
    async function getUser() {
      try {
        console.log('[CHAT] Getting user...');
        setLoading(true);
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
        setLoading(false);
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

    const handleAuthComplete = (message: any) => {
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialInput || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Process initialInput if provided
  useEffect(() => {
    if (initialInput && !isLoading) {
      console.log('Debug: Setting input from initialInput:', initialInput);
      setInput(initialInput);
    }
  }, [initialInput, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Create the display message (without page content)
    const displayMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, displayMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    console.log('Debug: Submitting chat:', { input, selectedModel, mode });
    try {
      console.log('current model:', selectedModel);

      // Extract page context
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let currentContent = '';
      if (tab?.id) {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.body.innerText,
        });
        console.log('Debug: Retrieved page content:', result);
        if (result?.result) {
          currentContent = result.result;
        }
      }

      const pageContext: PageContext = {
        title: tab?.title,
        url: tab?.url,
        content: currentContent,
      };
      setPageContext(pageContext);

      // Get current model info
      const modelInfo = [
        ...(openaiModels || []),
        ...(geminiModels || []),
        ...(anthropicModels || []),
        ...(ollamaModels || []),
      ].find(model => model.name === selectedModel) || {
        name: selectedModel,
        provider: selectedModel.startsWith('gpt')
          ? 'openai'
          : selectedModel.includes('gemini')
            ? 'gemini'
            : selectedModel.startsWith('claude')
              ? 'anthropic'
              : 'ollama',
        displayName: selectedModel,
      };

      // Create an action context for enhanced interactive mode
      const actionContext = {
        sessionId: Date.now().toString(),
        previousActions: messages
          .filter(msg => msg.role === 'assistant')
          .slice(-3)
          .map(msg => {
            try {
              const json = JSON.parse(msg.content);
              return json.task_type || 'unknown';
            } catch (e) {
              return 'conversational';
            }
          }),
        availableTools: ['navigation', 'extraction', 'search', 'interaction'],
        userPreferences: {
          language: defaultLanguage || 'en',
          autoExecute: true,
        },
      };

      // Generate prompt using PromptManager with enhanced options
      const promptOptions = {
        goal: input,
        actionContext,
        truncateContent: true,
        includeMetadata: true,
        maxContentLength: 10000,
        enhancedMode: true,
      };

      // Generate prompt using PromptManager
      // Only conversational and interactive modes are supported now
      const prompt = PromptManager.generateContext(mode, pageContext, modelInfo, promptOptions);

      console.log('Debug: Generated prompt:', prompt);

      // Prepare messages for the selected model
      const questionId = Date.now().toString();
      const chatMessages = messages.concat({
        role: 'user',
        content: input,
        metadata: {
          questionId,
          timestamp: Date.now(),
        },
      });

      let response: string;
      let llmService: LLMService; // Will be instantiated as a proper LLM service
      if (selectedModel.startsWith('claude')) {
        const anthropicMessages = chatMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));
        llmService = new AnthropicService(selectedModel);
        response = await llmService.generateCompletion(anthropicMessages, prompt);
      } else if (selectedModel.includes('gemini')) {
        llmService = new GeminiService(selectedModel);
        response = await llmService.generateCompletion(chatMessages, prompt, undefined, mode);
        const modelName = selectedModel.replace('models/', '');
        const model = {
          name: selectedModel,
          provider: 'gemini',
          displayName: modelName.charAt(0).toUpperCase() + modelName.slice(1),
        };
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: response,
            model,
            metadata: {
              questionId: chatMessages[chatMessages.length - 1].metadata?.questionId,
              originalQuestion: chatMessages[chatMessages.length - 1].content,
              timestamp: Date.now(),
            },
          },
        ]);
        return;
      } else if (selectedModel.startsWith('gpt')) {
        llmService = new OpenAIService(selectedModel);
        response = await llmService.generateCompletion(chatMessages, prompt);
      } else {
        const llmService = new OllamaService(selectedModel, API_URL);
        response = await llmService.generateCompletion(chatMessages, prompt, undefined, mode);
      }

      console.log('Debug: Response:', response);
      const model = [
        ...(openaiModels || []),
        ...(geminiModels || []),
        ...(anthropicModels || []),
        ...(ollamaModels || []),
      ].find(model => model.name === selectedModel) || {
        name: selectedModel,
        provider: selectedModel.startsWith('gpt') ? 'openai' : 'ollama',
        displayName: selectedModel,
      };
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response,
          model,
          metadata: {
            questionId: chatMessages[chatMessages.length - 1].metadata?.questionId,
            originalQuestion: chatMessages[chatMessages.length - 1].content,
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

  return (
    <div className="flex flex-col h-full" style={{ fontFamily, fontSize: `${fontSize}px` }}>
      <div className="flex items-center justify-between p-2 border-b border-border">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 rounded-full bg-muted/30 px-2 py-1 hover:bg-muted/50 transition-colors cursor-pointer">
                <Avatar className="h-6 w-6">
                  {user.user_metadata?.avatar_url ? (
                    <AvatarImage src={user.user_metadata.avatar_url} alt={user.email || ''} />
                  ) : (
                    <AvatarFallback>{user.user_metadata?.full_name?.charAt(0).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
                <div className="text-sm font-medium truncate max-w-[120px]">
                  {user.user_metadata?.full_name || user.email || t('sidepanel_user')}
                </div>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <a
                  className="flex flex-col"
                  href="https://overlay.one/en/dashboard"
                  target="_blank"
                  rel="noopener noreferrer">
                  <span>{t('sidepanel_signed_in_as')}</span>
                  <span className="font-medium">{user.email}</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <div className="flex items-center gap-2 w-full">
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t('sidepanel_click_to_sign_out')}</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" variant="outline" className="flex items-center gap-2" onClick={handleSignIn}>
            <img src={icon} alt="Overlay" className="w-5 h-5" />
            <span>{t('sidepanel_sign_in')}</span>
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-full">
        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const timestamp = message.metadata?.timestamp
            ? new Date(message.metadata.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';

          // Determine message style based on role and possibly other factors
          const messageContainerClasses = isUser
            ? `ml-10 mr-2 bg-primary/10 border border-primary/20 rounded-tr-lg rounded-bl-lg rounded-br-lg shadow-sm`
            : `mr-10 ml-2 bg-muted border border-muted-foreground/10 rounded-tl-lg rounded-bl-lg rounded-br-lg shadow-sm`;

          // Get provider icon for assistant messages
          const ProviderIcon = !isUser
            ? (() => {
                const provider = message.model?.provider;
                return provider === 'openai'
                  ? OpenAIIcon
                  : provider === 'gemini'
                    ? GeminiIcon
                    : provider === 'anthropic'
                      ? AnthropicIcon
                      : provider === 'ollama'
                        ? OllamaIcon
                        : null;
              })()
            : null;

          // Get model/provider-specific accent color
          const accentColorClass = !isUser
            ? (() => {
                const provider = message.model?.provider;
                return provider === 'openai'
                  ? 'text-green-500'
                  : provider === 'gemini'
                    ? 'text-blue-500'
                    : provider === 'anthropic'
                      ? 'text-purple-500'
                      : provider === 'ollama'
                        ? 'text-amber-500'
                        : 'text-gray-500';
              })()
            : '';

          return (
            <div key={index} className="relative flex items-start gap-2 group">
              {/* Avatar/Icon for the message */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center
              ${isUser ? 'bg-primary/20' : 'bg-muted-foreground/10'}`}>
                {isUser ? (
                  <Terminal className="w-4 h-4 text-primary" />
                ) : ProviderIcon ? (
                  <ProviderIcon className={`w-4 h-4 ${accentColorClass}`} />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-500" />
                )}
              </div>

              {/* Message content */}
              <div className={`flex-1 p-3 ${messageContainerClasses}`}>
                {/* Message header */}
                <div
                  style={{ fontFamily, fontSize: `${fontSize}px` }}
                  className="flex justify-between items-center mb-1">
                  <div className="text-xs font-semibold flex items-center gap-1">
                    <span className={isUser ? 'text-primary' : accentColorClass}>
                      {isUser
                        ? t('sidepanel_you')
                        : message.model?.displayName || message.model?.name || t('sidepanel_assistant')}
                    </span>
                  </div>
                  {timestamp && (
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {timestamp}
                    </span>
                  )}
                </div>

                {/* Message content */}
                <div className="text-foreground overflow-x-auto max-w-full">
                  {mode === 'interactive' && message.role === 'assistant' ? (
                    <div className="space-y-2 max-w-full">
                      {(() => {
                        try {
                          console.log('Attempting to parse as TaskPlan:', message.content);
                          const plan: TaskPlan = JSON.parse(message.content);
                          console.log('Successfully parsed TaskPlan:', plan);

                          // Validate required properties before rendering
                          if (!plan.task_type || !Array.isArray(plan.actions) || !plan.error_handling) {
                            console.warn('JSON parsed but missing required TaskPlan properties:', plan);
                            throw new Error('Invalid TaskPlan structure');
                          }

                          return (
                            <TaskPlanView
                              plan={plan}
                              isLight={isLight}
                              pageContext={pageContext}
                              llmService={new AnthropicService(selectedModel)}
                              goal={message.metadata?.originalQuestion}
                            />
                          );
                        } catch (error) {
                          console.error('Error parsing as TaskPlan:', error);
                          // If not a valid TaskPlan JSON, try to format as regular JSON
                          try {
                            console.log('Attempting to parse as generic JSON');
                            const json = JSON.parse(message.content);
                            console.log('Successfully parsed as generic JSON');

                            // If JSON contains task_type but failed validation earlier, show formatted with warning
                            if (json.task_type) {
                              return (
                                <div>
                                  <div className="mb-2 p-2 bg-amber-100 text-amber-800 rounded-md text-sm">
                                    This appears to be a task plan but is missing required properties. Displaying as raw
                                    JSON.
                                  </div>
                                  <pre className="whitespace-pre-wrap break-words overflow-x-auto p-2 rounded text-sm bg-muted">
                                    {JSON.stringify(json, null, 2)}
                                  </pre>
                                </div>
                              );
                            }

                            return (
                              <pre className="whitespace-pre-wrap break-words overflow-x-auto p-2 rounded text-sm bg-muted">
                                {JSON.stringify(json, null, 2)}
                              </pre>
                            );
                          } catch (error) {
                            console.error('Error parsing as generic JSON:', error);
                            // If not JSON at all, render as markdown
                            return (
                              <div className="prose dark:prose-invert max-w-full break-words overflow-wrap-anywhere">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
                            );
                          }
                        }
                      })()}
                    </div>
                  ) : (
                    <div className="prose dark:prose-invert max-w-full break-words overflow-wrap-anywhere text-sm leading-relaxed">
                      <ReactMarkdown
                        components={{
                          // Enhanced code blocks with syntax highlighting
                          code: props => {
                            const { inline, className, children, ...otherProps } = props as {
                              inline?: boolean;
                              className?: string;
                              children: React.ReactNode;
                            };
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline ? (
                              <div className="relative group">
                                <pre
                                  className={`p-3 rounded-md bg-gray-900 dark:bg-gray-800 overflow-x-auto text-xs ${match ? `language-${match[1]}` : ''}`}>
                                  <code className={className} {...otherProps}>
                                    {children}
                                  </code>
                                </pre>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    className="p-1 rounded-md bg-gray-700 text-gray-100 hover:bg-gray-600 text-xs"
                                    onClick={() => {
                                      navigator.clipboard.writeText(String(children));
                                    }}>
                                    Copy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs" {...props}>
                                {children}
                              </code>
                            );
                          },
                          // Enhanced links
                          a: ({ children, ...props }) => (
                            <a
                              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                              target="_blank"
                              rel="noopener noreferrer"
                              {...props}>
                              {children}
                            </a>
                          ),
                          // Enhanced lists
                          ul: ({ className, children, ...props }) => (
                            <ul className="pl-5 list-disc space-y-1 my-2" {...props}>
                              {children}
                            </ul>
                          ),
                          ol: ({ node, className, children, ...props }) => (
                            <ol className="pl-5 list-decimal space-y-1 my-2" {...props}>
                              {children}
                            </ol>
                          ),
                          // Enhanced headings
                          h1: ({ node, className, children, ...props }) => (
                            <h1
                              className="text-xl font-bold mt-6 mb-2 pb-1 border-b border-gray-200 dark:border-gray-700"
                              {...props}>
                              {children}
                            </h1>
                          ),
                          h2: ({ node, className, children, ...props }) => (
                            <h2 className="text-lg font-bold mt-5 mb-2" {...props}>
                              {children}
                            </h2>
                          ),
                          h3: ({ node, className, children, ...props }) => (
                            <h3 className="text-md font-bold mt-4 mb-1" {...props}>
                              {children}
                            </h3>
                          ),
                        }}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="relative flex items-start gap-2">
            {/* Loading avatar/icon */}
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center
              bg-muted-foreground/10 animate-pulse">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 opacity-70" />
            </div>

            {/* Loading message content */}
            <div className="flex-1 p-3 mr-10 ml-2 bg-muted border border-muted-foreground/10 rounded-tl-lg rounded-bl-lg rounded-br-lg shadow-sm">
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('sidepanel_thinking')}</span>
              </div>

              {/* Typing animation dots */}
              <div className="flex mt-2 space-x-1">
                <div
                  className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}></div>
                <div
                  className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"
                  style={{ animationDelay: '200ms' }}></div>
                <div
                  className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"
                  style={{ animationDelay: '400ms' }}></div>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="relative flex items-start gap-2">
            {/* Error icon */}
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center
              bg-destructive/10">
              <ExclamationTriangleIcon className="w-4 h-4 text-destructive" />
            </div>

            {/* Error message content */}
            <div className="flex-1 p-3 mr-10 ml-2 bg-destructive/10 border border-destructive/20 rounded-lg shadow-sm">
              <div className="text-xs font-semibold mb-1 text-destructive">{t('sidepanel_error')}</div>
              <div className="text-sm text-destructive/90">{error}</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex space-x-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isLoading) {
                  handleSubmit(e);
                }
              }
            }}
            placeholder={t('sidepanel_message_placeholder')}
            style={{ fontFamily, fontSize: `${fontSize}px` }}
            className="flex-1 min-h-[40px] max-h-[200px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{ fontFamily, fontSize: `${fontSize}px` }}
            className="flex items-center gap-2"
            variant="default">
            <span>{t('sidepanel_send')}</span>
            <PaperAirplaneIcon className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};
