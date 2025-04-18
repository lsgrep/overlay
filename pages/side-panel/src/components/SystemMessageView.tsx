import type React from 'react';
import { memo } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { Task } from '@extension/shared/lib/services/api';
import { UnifiedTaskItem } from './UnifiedTaskView';
import { UnifiedNoteView } from './UnifiedNoteView';
import { MarkdownMessageContent } from './MarkdownMessageContent';
import icon from '../../../../chrome-extension/public/icon-128.png';

// Define types for the system message
export type SystemMessageType = 'note' | 'task' | 'loading' | 'error' | 'info';

export interface SystemMessageData {
  type: SystemMessageType;
  content: string;
  timestamp: number;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
}

interface SystemMessageViewProps {
  data: SystemMessageData;
  onEdit?: (data: SystemMessageData) => void;
  onDelete?: (data: SystemMessageData) => void;
  onCopy?: (data: SystemMessageData) => void;
  onToggleComplete?: (completed: boolean, data: SystemMessageData) => void;
  onUpdate?: (data: SystemMessageData, updatedTask: Task) => Promise<void>;
  isLight?: boolean;
  contentVersion?: number; // Used to force re-render when content changes
}

export const SystemMessageView: React.FC<SystemMessageViewProps> = memo(
  ({ data, onEdit, onDelete, onCopy, onToggleComplete, onUpdate, isLight = true, contentVersion = 0 }) => {
    const { type, content, timestamp, sourceUrl, metadata } = data;

    // If isDeleted is true, don't render anything
    if (metadata?.isDeleted) {
      return null;
    }

    // Loading state view
    if (type === 'loading') {
      return (
        <div className="relative p-3 my-2 shadow-sm">
          <div className="flex items-start gap-2">
            {/* Avatar with gradient similar to LoadingMessage */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-muted-foreground/10 animate-pulse">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 opacity-70" />
            </div>

            {/* Message content styled like LoadingMessage */}
            <div className="flex-1 p-3 mr-5 ml-0 bg-muted/20 border border-border rounded-tl-lg rounded-bl-lg rounded-br-lg">
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-foreground">{content}</span>
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
        </div>
      );
    }

    // Error state view
    if (type === 'error') {
      return (
        <div className="relative p-3 my-2 shadow-sm">
          <div className="flex items-start gap-2">
            {/* Avatar with error styling */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-destructive/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-destructive"
                viewBox="0 0 20 20"
                fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* Message content styled like LoadingMessage */}
            <div className="flex-1 p-3 mr-5 ml-0 bg-destructive/5 border border-destructive/20 rounded-tl-lg rounded-bl-lg rounded-br-lg">
              <MarkdownMessageContent content={content} />
            </div>
          </div>
        </div>
      );
    }

    // Info state view
    if (type === 'info') {
      return (
        <div className="relative p-3 my-2 shadow-sm">
          <div className="flex items-start gap-2">
            {/* Avatar with gradient similar to LoadingMessage */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-muted-foreground/10">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 opacity-70" />
            </div>

            {/* Message content styled like LoadingMessage */}
            <div className="flex-1 p-3 mr-5 ml-0 bg-muted/20 border border-border rounded-tl-lg rounded-bl-lg rounded-br-lg">
              <MarkdownMessageContent content={content} />
            </div>
          </div>
        </div>
      );
    }

    // Note view
    if (type === 'note') {
      // Get the note ID
      const noteId = metadata?.id as string;

      // Don't render a note if we don't have a valid ID
      if (!noteId) {
        console.warn('Note without ID found, rendering as info message instead.');
        return (
          <div className="relative p-3 my-2 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-muted-foreground/10">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 opacity-70" />
              </div>
              <div className="flex-1 p-3 mr-5 ml-0 bg-muted/20 border border-border rounded-tl-lg rounded-bl-lg rounded-br-lg">
                <p className="text-sm text-foreground">⚠️ {content} (Missing note ID)</p>
              </div>
            </div>
          </div>
        );
      }

      return (
        <UnifiedNoteView
          id={noteId}
          content={content}
          timestamp={timestamp}
          sourceUrl={sourceUrl}
          onCopy={onCopy ? () => onCopy(data) : undefined}
          onDelete={
            onDelete
              ? async id => {
                  onDelete(data);
                  return Promise.resolve();
                }
              : undefined
          }
          onUpdate={
            onEdit
              ? async (id, updatedContent, updatedSourceUrl) => {
                  // Create updated note data with the source URL
                  const updatedData = {
                    ...data,
                    content: updatedContent,
                    // Use passed sourceUrl or fall back to the original
                    sourceUrl: updatedSourceUrl || sourceUrl,
                  };

                  console.log('SystemMessageView updatedData:', updatedData);
                  onEdit(updatedData);
                  return Promise.resolve();
                }
              : undefined
          }
          contentVersion={contentVersion}
        />
      );
    }

    // Task view
    if (type === 'task') {
      // Create a proper task object - don't use fallback IDs
      const taskId = metadata?.id as string;

      // Don't render a task if we don't have a valid ID
      if (!taskId) {
        console.warn('Task without ID found, rendering as info message instead.');
        return (
          <div className="relative p-3 my-2 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-muted-foreground/10">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 opacity-70" />
              </div>
              <div className="flex-1 p-3 mr-5 ml-0 bg-muted/20 border border-border rounded-tl-lg rounded-bl-lg rounded-br-lg">
                <p className="text-sm text-foreground">⚠️ {content} (Missing task ID)</p>
              </div>
            </div>
          </div>
        );
      }

      const taskObject: Task = {
        id: taskId,
        taskId: taskId,
        title: content,
        notes: metadata?.notes as string,
        status: (metadata?.completed as boolean) ? 'completed' : 'needsAction',
        due: metadata?.dueDate as string,
      };

      return (
        <UnifiedTaskItem
          task={taskObject}
          isLight={isLight}
          timestamp={timestamp}
          sourceUrl={sourceUrl}
          onCopy={onCopy ? () => onCopy(data) : undefined}
          onDelete={
            onDelete
              ? async taskId => {
                  onDelete(data);
                  return Promise.resolve();
                }
              : undefined
          }
          onToggleComplete={
            onToggleComplete
              ? async (taskId, completed) => {
                  onToggleComplete(completed, data);
                  return Promise.resolve();
                }
              : undefined
          }
          onUpdate={
            onUpdate
              ? async updatedTask => {
                  // Create updated task data
                  const updatedData = {
                    ...data,
                    content: updatedTask.title, // Update the content with the new title
                    metadata: {
                      ...data.metadata,
                      id: updatedTask.id,
                      notes: updatedTask.notes,
                      completed: updatedTask.status === 'completed',
                      dueDate: updatedTask.due,
                    },
                  };

                  // Call the parent's onUpdate handler
                  await onUpdate(updatedData, updatedTask);
                  return Promise.resolve();
                }
              : undefined
          }
          contentVersion={contentVersion}
        />
      );
    }

    // Fallback for unknown types
    return (
      <div className="relative p-3 my-2 shadow-sm">
        <div className="flex items-start gap-2">
          {/* Default avatar with gradient */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-muted-foreground/10">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 opacity-70" />
          </div>

          {/* Message content styled like other messages */}
          <div className="flex-1 p-3 mr-5 ml-0 bg-muted/20 border border-border rounded-tl-lg rounded-bl-lg rounded-br-lg">
            <MarkdownMessageContent content={content} isLight={isLight} />
          </div>
        </div>
      </div>
    );
  },
);

SystemMessageView.displayName = 'SystemMessageView';
