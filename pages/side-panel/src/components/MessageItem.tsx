import type React from 'react';
import { Terminal, Link } from 'lucide-react';
import { OpenAIIcon, GeminiIcon, OllamaIcon, AnthropicIcon } from '@extension/ui/lib/icons';
import type { PageContext } from '../services/llm/prompts/types';
import { type Task, overlayApi } from '@extension/shared/lib/services/api';
import icon from '../../../../chrome-extension/public/icon-128.png';

// Import the extracted components
import { MarkdownMessageContent } from './MarkdownMessageContent';
import { SystemMessageView, type SystemMessageType } from './SystemMessageView';
import { UnifiedTaskListView } from './UnifiedTaskView';
import { deleteNote } from '@extension/shared/lib/services/supabase';

// ========================
// Shared Types & Interfaces
// ========================

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
    sourceUrl?: string;
    isTaskList?: boolean; // Indicate if this message contains tasks
    tasks?: Task[]; // Array of task items if this is a task message
    systemMessageType?: string; // Type for system messages
  };
  images?: Array<{
    url: string;
    mimeType?: string;
  }>; // Array of images attached to the message
}

interface MessageItemProps {
  message: Message;
  index: number;
  isLight: boolean;
  mode: 'interactive' | 'conversational';
  pageContext: PageContext | null;
  selectedModel: string;
  fontFamily: string;
  fontSize: number;
}

// Common props for the message content components
interface MessageContentProps {
  isLight: boolean;
}

// Props for the interactive message content component
interface InteractiveContentProps extends MessageContentProps {
  message: Message;
}

// ========================
// Utility Components
// ========================

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

// Avatar/Icon component for messages
const MessageAvatar: React.FC<{ isUser: boolean; provider?: string }> = ({ isUser, provider }) => {
  const ProviderIcon = !isUser
    ? (() => {
        if (provider === 'openai') return OpenAIIcon;
        if (provider === 'gemini') return GeminiIcon;
        if (provider === 'anthropic') return AnthropicIcon;
        if (provider === 'ollama') return OllamaIcon;
        return null;
      })()
    : null;

  const accentColorClass = !isUser
    ? (() => {
        if (provider === 'openai') return 'text-green-500';
        if (provider === 'gemini') return 'text-blue-500';
        if (provider === 'anthropic') return 'text-purple-500';
        if (provider === 'ollama') return 'text-amber-500';
        return 'text-gray-500';
      })()
    : '';

  return (
    <div
      className={`flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center
      ${isUser ? 'bg-primary/20' : 'bg-muted-foreground/10'}`}>
      {isUser ? (
        <Terminal className="w-4 h-4 text-primary" />
      ) : ProviderIcon ? (
        <ProviderIcon className={`w-4 h-4 ${accentColorClass}`} />
      ) : (
        <img src={icon} alt="Overlay" className="w-5 h-5" />
      )}
    </div>
  );
};

// Message Header component
const MessageHeader: React.FC<{
  isUser: boolean;
  model?: Message['model'];
  timestamp?: number;
  sourceUrl?: string;
  accentColorClass: string;
  fontFamily: string;
  fontSize: number;
}> = ({ isUser, model, timestamp, sourceUrl, accentColorClass, fontFamily, fontSize }) => {
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={{ fontFamily, fontSize: `${fontSize}px` }} className="flex justify-between items-center mb-1">
      <div className="text-xs font-semibold flex items-center gap-1">
        <span className={isUser ? 'text-primary' : accentColorClass}>
          {isUser ? 'You' : model?.displayName || model?.name || 'Assistant'}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        {formattedTime && <span className="text-xs text-muted-foreground">{formattedTime}</span>}
        {sourceUrl && <SourceUrl url={sourceUrl} />}
      </div>
    </div>
  );
};

// Component for interactive message content (JSON handling)
const InteractiveMessageContent: React.FC<InteractiveContentProps> = ({ message, isLight }) => {
  return (
    <div className="space-y-2 max-w-full">
      {(() => {
        try {
          console.log('Attempting to parse as JSON:', message.content);
          const parsedJson = JSON.parse(message.content);

          // Just format as JSON
          return (
            <pre
              className={`whitespace-pre-wrap break-words overflow-x-auto p-2 rounded text-sm ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-100'}`}>
              {JSON.stringify(parsedJson, null, 2)}
            </pre>
          );
        } catch (error) {
          console.error('Error parsing as JSON:', error);
          // If not JSON at all, render as markdown
          return <MarkdownMessageContent content={message.content} isLight={isLight} />;
        }
      })()}
    </div>
  );
};

// Main MessageItem component using the specialized components
export const MessageItem: React.FC<MessageItemProps> = ({ message, index, isLight, mode, fontFamily, fontSize }) => {
  const isUser = message.role === 'user';
  const timestamp = message.metadata?.timestamp;
  const sourceUrl = message.metadata?.sourceUrl || '';

  // Process task content if not explicitly defined in metadata
  const { isTaskList, tasks } =
    message.metadata?.isTaskList !== undefined
      ? { isTaskList: message.metadata.isTaskList, tasks: message.metadata.tasks || [] }
      : { isTaskList: false, tasks: [] };

  // Determine message style based on role and theme
  const messageContainerClasses = isUser
    ? `ml-10 mr-2 bg-primary/10 border border-primary/20 rounded-tr-lg rounded-bl-lg rounded-br-lg shadow-sm`
    : `mr-10 ml-2 bg-muted border border-border rounded-tl-lg rounded-bl-lg rounded-br-lg shadow-sm`;

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

  // Get provider icon for assistant messages
  const providerType = !isUser ? message.model?.provider : undefined;

  // Check if this is a system message that should use SystemMessageView
  if (message.role === 'system' && message.metadata && message.metadata.systemMessageType) {
    const messageType = message.metadata.systemMessageType as SystemMessageType;

    // Handle system messages with SystemMessageView
    return (
      <SystemMessageView
        data={{
          type: messageType,
          content: message.content,
          timestamp: timestamp || Date.now(),
          sourceUrl,
          metadata: message.metadata,
        }}
        isLight={isLight}
        onCopy={() => {
          navigator.clipboard.writeText(message.content);
          console.log('Copied to clipboard');
        }}
        onDelete={async data => {
          try {
            // Handle different delete operations based on message type
            if (data.type === 'task' && data.metadata?.id) {
              const taskId = data.metadata.id as string;
              await overlayApi.deleteTask(taskId);
              console.log(`Task ${taskId} deleted successfully`);
            } else if (data.type === 'note' && data.metadata?.id) {
              const noteId = data.metadata.id as string;
              const result = await deleteNote(noteId);
              if (result.success) {
                console.log(`Note ${noteId} deleted successfully`);
              } else {
                console.error(`Failed to delete note: ${result.error}`);
              }
            }
          } catch (error) {
            console.error('Error deleting item:', error);
          }
        }}
        onToggleComplete={async (completed, data) => {
          try {
            if (data.metadata?.id) {
              const taskId = data.metadata.id as string;
              // Call the API to update the task status
              await overlayApi.updateTask(taskId, {
                status: completed ? 'completed' : 'needsAction',
              });
              console.log(`Task ${taskId} status updated to ${completed ? 'completed' : 'needsAction'}`);
            }
          } catch (error) {
            console.error('Error toggling task completion:', error);
          }
        }}
        onUpdate={async (data, updatedTask) => {
          try {
            if (data.type === 'task' && data.metadata?.id) {
              const taskId = data.metadata.id as string;
              // Call the API to update the task with all new details
              await overlayApi.updateTask(taskId, updatedTask);
              console.log(`Task ${taskId} updated successfully`, updatedTask);
            }
            return Promise.resolve();
          } catch (error) {
            console.error('Error updating task:', error);
            return Promise.reject(error);
          }
        }}
        onEdit={data => {
          // For notes, we update the data in the UI
          // The actual update to the database would happen elsewhere
          console.log('Editing data:', data);
        }}
      />
    );
  }

  return (
    <div key={index} className="relative flex items-start gap-2 group">
      {/* Avatar/Icon for the message */}
      <MessageAvatar isUser={isUser} provider={providerType} />

      {/* Message content */}
      <div className={`flex-1 p-3 ${messageContainerClasses}`}>
        {/* Message header */}
        <MessageHeader
          isUser={isUser}
          model={message.model}
          timestamp={timestamp}
          sourceUrl={sourceUrl}
          accentColorClass={accentColorClass}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />

        {/* Message content */}
        <div className="text-foreground overflow-x-auto max-w-full">
          {/* Special handling for task list messages */}
          {isTaskList && tasks.length > 0 ? (
            <UnifiedTaskListView
              tasks={tasks}
              isLight={isLight}
              onUpdate={async task => {
                try {
                  await overlayApi.updateTask(task.id, task);
                  console.log(`Task ${task.id} updated successfully`, task);
                  return Promise.resolve();
                } catch (error) {
                  console.error('Error updating task:', error);
                  return Promise.reject(error);
                }
              }}
              onDelete={async taskId => {
                try {
                  await overlayApi.deleteTask(taskId);
                  console.log(`Task ${taskId} deleted successfully`);
                  return Promise.resolve();
                } catch (error) {
                  console.error('Error deleting task:', error);
                  return Promise.reject(error);
                }
              }}
              onToggleComplete={async (taskId, completed) => {
                try {
                  await overlayApi.updateTask(taskId, {
                    status: completed ? 'completed' : 'needsAction',
                  });
                  console.log(`Task ${taskId} status updated to ${completed ? 'completed' : 'needsAction'}`);
                  return Promise.resolve();
                } catch (error) {
                  console.error('Error toggling task completion:', error);
                  return Promise.reject(error);
                }
              }}
            />
          ) : mode === 'interactive' && message.role === 'assistant' ? (
            <InteractiveMessageContent message={message} isLight={isLight} />
          ) : (
            <>
              {/* Display images if they exist in the message */}
              {message.images && message.images.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    {message.images.map((image, imgIndex) => (
                      <div key={imgIndex} className="relative border border-gray-300 rounded overflow-hidden">
                        <img
                          src={image.url}
                          alt={`${imgIndex + 1}`}
                          className="w-auto max-w-full h-auto max-h-48 object-contain"
                          onError={e => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML =
                              '<div class="p-2 text-xs text-red-500">Error loading image</div>';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <MarkdownMessageContent content={message.content} isLight={isLight} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
