import type React from 'react';
import { NoteView } from './NoteView';
import { TaskItemView } from './TaskItemView';
// Import the Spinner component from UI library
import { Loader2 } from 'lucide-react';

// Spinner component for loading states
const SpinnerCircle = ({ className }: { className?: string }) => (
  <Loader2 className={`animate-spin ${className || ''}`} />
);

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
}

export const SystemMessageView: React.FC<SystemMessageViewProps> = ({
  data,
  onEdit,
  onDelete,
  onCopy,
  onToggleComplete,
}) => {
  const { type, content, timestamp, sourceUrl, metadata } = data;

  // Loading state view
  if (type === 'loading') {
    return (
      <div className="flex items-center p-3 my-2 bg-slate-100 dark:bg-slate-800 rounded-md">
        <SpinnerCircle className="w-4 h-4 mr-2 text-blue-500" />
        <span className="text-sm text-gray-700 dark:text-gray-300">{content}</span>
      </div>
    );
  }

  // Error state view
  if (type === 'error') {
    return (
      <div className="p-3 my-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
        <div className="flex items-center">
          <span className="mr-2">❌</span>
          <span className="text-sm font-medium text-red-800 dark:text-red-400">Error</span>
        </div>
        <p className="text-sm text-red-700 dark:text-red-300 mt-1">{content}</p>
      </div>
    );
  }

  // Info state view
  if (type === 'info') {
    return (
      <div className="p-3 my-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="flex items-center">
          <span className="mr-2">ℹ️</span>
          <span className="text-sm font-medium text-blue-800 dark:text-blue-400">Info</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{content}</p>
      </div>
    );
  }

  // Note view
  if (type === 'note') {
    return (
      <NoteView
        content={content}
        timestamp={timestamp}
        sourceUrl={sourceUrl}
        onEdit={onEdit ? () => onEdit(data) : undefined}
        onDelete={onDelete ? () => onDelete(data) : undefined}
        onCopy={onCopy ? () => onCopy(data) : undefined}
      />
    );
  }

  // Task view
  if (type === 'task') {
    return (
      <TaskItemView
        title={content}
        timestamp={timestamp}
        sourceUrl={sourceUrl}
        completed={metadata?.completed as boolean}
        onEdit={onEdit ? () => onEdit(data) : undefined}
        onDelete={onDelete ? () => onDelete(data) : undefined}
        onCopy={onCopy ? () => onCopy(data) : undefined}
        onToggleComplete={onToggleComplete ? completed => onToggleComplete(completed, data) : undefined}
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
