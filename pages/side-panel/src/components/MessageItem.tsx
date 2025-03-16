import type React from 'react';
import ReactMarkdown from 'react-markdown';
import { Terminal, Link, CheckSquare, Square, ListChecks } from 'lucide-react';
import { TaskPlanView } from '../components/TaskPlanView';
import { AnthropicService } from '../services/llm/anthropic';
import { OpenAIIcon, GeminiIcon, OllamaIcon, AnthropicIcon } from '@extension/ui/lib/icons';
import type { PageContext } from '../services/llm/prompts/types';
import type { TaskPlan } from '../services/task/types';

// Source URL component to ensure consistent formatting
const SourceUrl: React.FC<{ url: string }> = ({ url }) => {
  try {
    const hostname = new URL(url).hostname;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-500 hover:underline max-w-[200px] truncate inline-block"
        title={url}>
        <span className="flex items-center gap-1">
          <Link size={10} />
          {hostname}
        </span>
      </a>
    );
  } catch {
    return null;
  }
};

interface TaskItem {
  text: string;
  completed: boolean;
  dueDate?: string; // Optional due date
}

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
      extractedData?: unknown;
      timestamp?: number;
      sourceUrl?: string;
      isTaskList?: boolean; // Indicate if this message contains tasks
      tasks?: TaskItem[]; // Array of task items if this is a task message
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

// Helper function to detect if content could be a task list
const detectTaskContent = (content: string): { isTaskList: boolean; tasks: TaskItem[] } => {
  // Simple detection for task-like content with checkbox markdown syntax
  const lines = content.split('\n');
  const checkboxPattern = /^\s*[-*]\s*\[([ xX])\]\s*(.+)$/;

  const possibleTasks = lines
    .map(line => {
      const match = line.match(checkboxPattern);
      if (match) {
        return {
          text: match[2].trim(),
          completed: match[1].toLowerCase() === 'x',
        };
      }
      return null;
    })
    .filter(task => task !== null) as TaskItem[];

  // If we have at least one task, consider it a task list
  return {
    isTaskList: possibleTasks.length > 0,
    tasks: possibleTasks,
  };
};

// Component to render a task list
const TaskListView: React.FC<{ tasks: TaskItem[]; isLight: boolean }> = ({ tasks, isLight }) => {
  return (
    <div className="my-2">
      <div className="flex items-center gap-2 mb-2 text-sm font-medium">
        <ListChecks size={16} />
        <span>Tasks</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2 p-2 rounded ${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800'} transition-colors`}>
            <div className="flex-shrink-0 mt-0.5">
              {task.completed ? (
                <CheckSquare size={18} className="text-green-500" />
              ) : (
                <Square size={18} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.text}</p>
              {task.dueDate && <p className="text-xs text-gray-500 mt-1">Due: {task.dueDate}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
  // Get source URL from message metadata
  const sourceUrl = message.metadata?.sourceUrl || '';

  // Process task content if not explicitly defined in metadata
  const { isTaskList, tasks } =
    message.metadata?.isTaskList !== undefined
      ? { isTaskList: message.metadata.isTaskList, tasks: message.metadata.tasks || [] }
      : detectTaskContent(message.content);

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
          <div className="flex flex-col items-end gap-1">
            {timestamp && <span className="text-xs text-muted-foreground">{timestamp}</span>}
            {sourceUrl && <SourceUrl url={sourceUrl} />}
          </div>
        </div>

        {/* Message content */}
        <div className="text-foreground overflow-x-auto max-w-full">
          {/* Special handling for task list messages */}
          {isTaskList && tasks.length > 0 ? (
            <TaskListView tasks={tasks} isLight={isLight} />
          ) : mode === 'interactive' && message.role === 'assistant' ? (
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
                          <pre
                            className={`whitespace-pre-wrap break-words overflow-x-auto p-2 rounded text-sm ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-100'}`}>
                            {JSON.stringify(json, null, 2)}
                          </pre>
                        </div>
                      );
                    }

                    return (
                      <pre
                        className={`whitespace-pre-wrap break-words overflow-x-auto p-2 rounded text-sm ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-100'}`}>
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
                          className={`p-3 rounded-md overflow-x-auto text-xs ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-100'} ${match ? `language-${match[1]}` : ''}`}>
                          <code className={className} {...otherProps}>
                            {children}
                          </code>
                        </pre>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className={`p-1 rounded-md text-xs ${isLight ? 'bg-slate-300 text-slate-800 hover:bg-slate-400' : 'bg-slate-700 text-slate-100 hover:bg-slate-600'}`}
                            onClick={() => {
                              navigator.clipboard.writeText(String(children));
                            }}>
                            Copy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <code
                        className={`px-1 py-0.5 rounded text-xs ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-100'}`}
                        {...props}>
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
                  // Enhanced lists with special handling for checkbox markdown
                  ul: ({ children, ...props }) => {
                    // Don't apply task styling here - we detect and render tasks separately
                    return (
                      <ul className="pl-5 list-disc space-y-1 my-2" {...props}>
                        {children}
                      </ul>
                    );
                  },
                  ol: ({ children, ...props }) => (
                    <ol className="pl-5 list-decimal space-y-1 my-2" {...props}>
                      {children}
                    </ol>
                  ),
                  // Special handling for list items to convert checkbox markdown to interactive elements
                  li: ({ children, ...props }) => {
                    // Safe access to node content with proper type handling
                    // We need to use a type assertion here to safely access the AST node structure
                    const node = props.node as {
                      children?: Array<{
                        type?: string;
                        children?: Array<{ value?: string }>;
                      }>;
                    };
                    let textContent = '';

                    // Safely extract text content from the node structure
                    if (node?.children?.[0]?.children?.[0]?.value) {
                      textContent = node.children[0].children[0].value;
                    }

                    // Match checkbox pattern if text content exists
                    if (textContent) {
                      const match = textContent.match(/^\[([ xX])\]\s*(.+)$/);

                      if (match) {
                        const checked = match[1].toLowerCase() === 'x';
                        return (
                          <li className="!list-none -ml-5" {...props}>
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 mt-0.5">
                                {checked ? (
                                  <CheckSquare size={18} className="text-green-500" />
                                ) : (
                                  <Square size={18} className="text-gray-400" />
                                )}
                              </div>
                              <span className={`${checked ? 'line-through text-gray-500' : ''}`}>{match[2]}</span>
                            </div>
                          </li>
                        );
                      }
                    }
                    return <li {...props}>{children}</li>;
                  },
                  // Enhanced headings
                  h1: ({ children, ...props }) => (
                    <h1
                      className="text-xl font-bold mt-6 mb-2 pb-1 border-b border-gray-200 dark:border-gray-700"
                      {...props}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2 className="text-lg font-bold mt-5 mb-2" {...props}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
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
