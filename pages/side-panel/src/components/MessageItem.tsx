import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Terminal } from 'lucide-react';
import { TaskPlanView } from '../components/TaskPlanView';
import { AnthropicService } from '../services/llm/anthropic';
import { OpenAIIcon, GeminiIcon, OllamaIcon, AnthropicIcon } from '@extension/ui/lib/icons';
import type { PageContext } from '../services/llm/prompts/types';
import type { TaskPlan } from '../services/task/types';

interface MessageItemProps {
  message: {
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
  };
  index: number;
  isLight: boolean;
  mode: 'interactive' | 'conversational';
  pageContext: PageContext | null;
  selectedModel: string;
  fontFamily: string;
  fontSize: number;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  index,
  isLight,
  mode,
  pageContext,
  selectedModel,
  fontFamily,
  fontSize,
}) => {
  const isUser = message.role === 'user';
  const timestamp = message.metadata?.timestamp
    ? new Date(message.metadata.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  // Determine message style based on role
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
        <div style={{ fontFamily, fontSize: `${fontSize}px` }} className="flex justify-between items-center mb-1">
          <div className="text-xs font-semibold flex items-center gap-1">
            <span className={isUser ? 'text-primary' : accentColorClass}>
              {isUser ? 'You' : message.model?.displayName || message.model?.name || 'Assistant'}
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
                  const parsedJson = JSON.parse(message.content);
                  console.log('Successfully parsed JSON:', parsedJson);

                  // Handle Gemini model structure that wraps task plan in "answer" field
                  let plan: TaskPlan;

                  // Check if this is a nested structure (Gemini format)
                  if (parsedJson.answer && typeof parsedJson.answer === 'object' && parsedJson.confidence) {
                    console.log('Detected Gemini nested format, extracting task plan from answer field');

                    // For Gemini models that return steps instead of actions
                    if (parsedJson.answer.goal && Array.isArray(parsedJson.answer.steps)) {
                      // Convert to proper TaskPlan format
                      plan = {
                        task_type: 'web_navigation',
                        actions: parsedJson.answer.steps.map((step: Record<string, unknown>, index: number) => ({
                          id: `step-${index}`,
                          type: step.action,
                          description: step.description,
                          parameters: {
                            ...Object.keys(step)
                              .filter(key => key !== 'action' && key !== 'description')
                              .reduce((obj: Record<string, unknown>, key) => {
                                obj[key] = step[key];
                                return obj;
                              }, {}),
                          },
                        })),
                        error_handling: {
                          retry_strategy: 'linear',
                          max_retries: 3,
                        },
                      };
                    } else if (typeof parsedJson.answer === 'string') {
                      // If answer is a string, it might be a JSON string containing the plan
                      try {
                        const nestedPlan = JSON.parse(parsedJson.answer);
                        plan = nestedPlan.task_type
                          ? nestedPlan
                          : {
                              task_type: 'response',
                              actions: [],
                              error_handling: { retry_strategy: 'none', max_retries: 0 },
                            };
                      } catch {
                        throw new Error('Cannot parse nested JSON in answer field');
                      }
                    } else {
                      // Just use the answer object directly if it has required fields
                      plan = parsedJson.answer;
                    }
                  } else {
                    // Standard format, use as-is
                    plan = parsedJson;
                  }

                  console.log('Final parsed TaskPlan:', plan);

                  // Validate required properties before rendering
                  if (!plan.task_type || !Array.isArray(plan.actions) || !plan.error_handling) {
                    console.warn('JSON parsed but missing required TaskPlan properties:', plan);
                    throw new Error('Invalid TaskPlan structure');
                  }

                  return (
                    <TaskPlanView
                      plan={plan}
                      isLight={isLight}
                      pageContext={pageContext || undefined}
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
                            This appears to be a task plan but is missing required properties. Displaying as raw JSON.
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
};
