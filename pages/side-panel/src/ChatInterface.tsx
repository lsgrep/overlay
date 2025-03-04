import { useEffect, useRef, useState } from 'react';
import { useStorage } from '@extension/shared';
import { fontFamilyStorage, fontSizeStorage, defaultLanguageStorage } from '@extension/storage';
import { PaperAirplaneIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { Terminal, UserCircle, LogOut, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { t, DevLocale } from '@extension/i18n';
import { TaskPlanView } from './components/TaskPlanView';
import { type TaskPlan } from './services/task/TaskExecutor';
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
  mode: 'interactive' | 'conversational' | 'context-menu';
  initialInput?: string;
  openaiModels: Array<{ name: string; displayName?: string; provider: string }>;
  googleModels: Array<{ name: string; displayName?: string; provider: string }>;
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
  googleModels,
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
      // Set the locale directly from storage
      t.devLocale = defaultLanguage as DevLocale;
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
        ...(googleModels || []),
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

      let response;
      let llmService: LLMService;
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
      const model = [...(openaiModels || []), ...(anthropicModels || []), ...(ollamaModels || [])].find(
        model => model.name === selectedModel,
      ) || {
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
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg break-words max-w-full ${message.role === 'user' ? 'bg-primary/10 ml-4' : 'bg-muted mr-4'}`}>
            <div
              style={{ fontFamily, fontSize: `${fontSize}px` }}
              className="text-xs font-semibold mb-1 flex items-center gap-1 text-muted-foreground">
              {message.role === 'user' ? (
                <>
                  <Terminal className="w-3 h-3" />
                  <span>{t('sidepanel_you')}</span>
                </>
              ) : (
                <>
                  {(() => {
                    const provider = message.model?.provider;
                    const Icon =
                      provider === 'openai'
                        ? OpenAIIcon
                        : provider === 'gemini'
                          ? GeminiIcon
                          : provider === 'anthropic'
                            ? AnthropicIcon
                            : provider === 'ollama'
                              ? OllamaIcon
                              : null;

                    return (
                      <>
                        {Icon && <Icon className="w-3 h-3" />}
                        <span>{message.model?.displayName || message.model?.name || t('sidepanel_assistant')}</span>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
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
                <div className="prose dark:prose-invert max-w-full break-words overflow-wrap-anywhere">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-center py-2 text-muted-foreground">
            <div className="flex gap-1">
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t('sidepanel_thinking')}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="text-destructive p-3 rounded-lg bg-destructive/10 mr-4">
            <div className="text-xs font-semibold mb-1">{t('sidepanel_error')}</div>
            <div>{error}</div>
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
