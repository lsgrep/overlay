import type React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { Task } from '@extension/shared/lib/services/api';
import { UnifiedTaskItem } from './UnifiedTaskView';
import { UnifiedNoteView } from './UnifiedNoteView';

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
}

export const SystemMessageView: React.FC<SystemMessageViewProps> = ({
  data,
  onEdit,
  onDelete,
  onCopy,
  onToggleComplete,
  onUpdate,
}) => {
  const { type, content, timestamp, sourceUrl, metadata } = data;

  // Loading state view
  if (type === 'loading') {
    return (
      <div className="relative p-3 my-2 border border-slate-200 dark:border-slate-700 bg-muted rounded-md shadow-sm">
        <div className="flex items-center gap-3">
          {/* Gradient pulsing icon similar to LoadingMessage */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden flex items-center justify-center animate-pulse">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 opacity-70" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">{content}</span>
            </div>

            {/* Typing animation dots from LoadingMessage */}
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
      <div className="relative p-3 my-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md shadow-sm">
        <div className="flex items-center gap-3">
          {/* Error icon with similar styling to loading */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-red-100 dark:bg-red-800/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-red-500 dark:text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <div className="flex-1">
            <div className="flex items-center">
              <span className="text-sm font-medium text-red-800 dark:text-red-400">Error</span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  // Info state view
  if (type === 'info') {
    return (
      <div className="relative p-3 my-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md shadow-sm">
        <div className="flex items-center gap-3">
          {/* Info icon with similar styling to loading */}
          <div className="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-blue-100 dark:bg-blue-800/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-blue-500 dark:text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <div className="flex-1">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-400">Info</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  // Note view
  if (type === 'note') {
    return (
      <UnifiedNoteView
        id={metadata?.id as string}
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
            ? async (id, updatedContent) => {
                // Create updated note data
                const updatedData = {
                  ...data,
                  content: updatedContent,
                };

                onEdit(updatedData);
                return Promise.resolve();
              }
            : undefined
        }
      />
    );
  }

  // Task view
  if (type === 'task') {
    // Create a proper task object
    const taskObject: Task = {
      id: (metadata?.id as string) || `task-${timestamp}`,
      taskId: (metadata?.id as string) || `task-${timestamp}`,
      title: content,
      notes: metadata?.notes as string,
      status: (metadata?.completed as boolean) ? 'completed' : 'needsAction',
      due: metadata?.dueDate as string,
    };

    return (
      <UnifiedTaskItem
        task={taskObject}
        isLight={true}
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
      />
    );
  }

  // Fallback for unknown types
  return (
    <div className="p-3 my-2 bg-slate-100 dark:bg-slate-800 rounded-md">
      <p className="text-sm text-gray-700 dark:text-gray-300">{content}</p>
    </div>
  );
};
