import { useState, useEffect } from 'react';
import { Copy, Edit, Trash, Save, X, CalendarIcon, Loader2 } from 'lucide-react';
import {
  Button,
  Checkbox,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Textarea,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Calendar,
} from '@extension/ui/lib/ui';
import { cn } from '@extension/ui/lib/utils';
import { overlayApi, type Task } from '@extension/shared/lib/services/api';

// Spinner component for loading states
type SpinnerProps = {
  size?: number;
  className?: string;
};

const Spinner: React.FC<SpinnerProps> = ({ size = 16, className }) => (
  <Loader2 size={size} className={cn('animate-spin text-blue-500', className)} />
);

interface TaskItemViewProps {
  id: string;
  title: string;
  notes?: string;
  timestamp: number;
  sourceUrl?: string;
  completed?: boolean;
  dueDate?: string;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onCopy?: () => void;
  onToggleComplete?: (id: string, completed: boolean) => Promise<void>;
  onUpdate?: (task: Task) => Promise<void>;
}

export const TaskItemView: React.FC<TaskItemViewProps> = ({
  id,
  title,
  notes = '',
  timestamp,
  sourceUrl,
  completed = false,
  dueDate,
  onEdit,
  onDelete,
  onCopy,
  onToggleComplete,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedNotes, setEditedNotes] = useState(notes);
  const [editedDueDate, setEditedDueDate] = useState<string | undefined>(dueDate);
  const formattedDate = new Date(timestamp).toLocaleString();

  useEffect(() => {
    // Reset form when cancelling edit mode
    if (!isEditing) {
      setEditedTitle(title);
      setEditedNotes(notes);
      setEditedDueDate(dueDate);
    }
  }, [isEditing, title, notes, dueDate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(title);
    if (onCopy) onCopy();
  };

  const handleToggleComplete = async () => {
    if (onToggleComplete) {
      setIsLoading(true);
      try {
        await onToggleComplete(id, !completed);
      } catch (error) {
        console.error('Error toggling task completion:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit({
        id,
        taskId: id,
        title,
        notes,
        status: completed ? 'completed' : 'needsAction',
        due: dueDate,
      });
    } else {
      setIsEditing(true);
    }
  };

  const handleDelete = () => {
    if (onDelete) onDelete(id);
  };

  const handleSave = async () => {
    if (!onUpdate) return;

    setIsLoading(true);
    try {
      const updatedTask: Task = {
        id,
        taskId: id,
        title: editedTitle,
        notes: editedNotes,
        status: completed ? 'completed' : 'needsAction',
        due: editedDueDate,
      };

      await onUpdate(updatedTask);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setEditedDueDate(date?.toISOString());
  };

  // View mode
  if (!isEditing) {
    return (
      <Card className="border-gray-200 shadow-sm mb-2 bg-slate-50 dark:bg-slate-900 dark:border-gray-700">
        <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
            <span className="mr-2">✅</span> Task
            {dueDate && (
              <span className="ml-2 text-xs text-gray-500 font-normal flex items-center gap-1">
                <CalendarIcon size={12} />
                Due: {overlayApi.formatDate(dueDate)}
              </span>
            )}
          </CardTitle>
          <div className="flex space-x-1">
            {onCopy && (
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-6 w-6">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
            {(onEdit || onUpdate) && (
              <Button variant="ghost" size="icon" onClick={handleEdit} className="h-6 w-6" disabled={isLoading}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={handleDelete} className="h-6 w-6" disabled={isLoading}>
                <Trash className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <div className="flex items-start space-x-2">
            {onToggleComplete && (
              <div className="mt-1">
                {isLoading ? (
                  <Spinner size={14} />
                ) : (
                  <Checkbox id={`task-${id}`} checked={completed} onCheckedChange={handleToggleComplete} />
                )}
              </div>
            )}
            <div className="flex-1">
              <label
                htmlFor={`task-${id}`}
                className={`text-sm ${completed ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-300'} whitespace-pre-wrap`}>
                {title}
              </label>
              {notes && <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{notes}</p>}
              <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>{formattedDate}</span>
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline truncate max-w-[150px]">
                    {new URL(sourceUrl).hostname}
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edit mode
  return (
    <Card className="border-gray-200 shadow-sm mb-2 bg-white dark:bg-slate-800 dark:border-gray-700 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-black/5 dark:bg-black/20 flex items-center justify-center z-10 rounded-md">
          <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-md">
            <Spinner size={24} />
          </div>
        </div>
      )}
      <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <span className="mr-2">✏️</span> Edit Task
        </CardTitle>
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" onClick={handleCancel} className="h-6 w-6" disabled={isLoading}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div>
          <label htmlFor="task-title" className="block text-xs font-medium text-gray-500 mb-1">
            Title
          </label>
          <input
            id="task-title"
            type="text"
            value={editedTitle}
            onChange={e => setEditedTitle(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-70"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="task-notes" className="block text-xs font-medium text-gray-500 mb-1">
            Notes
          </label>
          <Textarea
            id="task-notes"
            value={editedNotes || ''}
            onChange={e => setEditedNotes(e.target.value)}
            className="w-full min-h-[60px]"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="task-due-date" className="block text-xs font-medium text-gray-500 mb-1">
            Due Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                disabled={isLoading}
                id="task-due-date">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {editedDueDate ? (
                  overlayApi.formatDate(editedDueDate)
                ) : (
                  <span className="text-muted-foreground">Select a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={editedDueDate ? new Date(editedDueDate) : undefined}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {editedDueDate && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs text-gray-500"
              onClick={() => setEditedDueDate(undefined)}
              disabled={isLoading}>
              Clear due date
            </Button>
          )}
        </div>

        {onToggleComplete && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`edit-task-${id}-completed`}
              checked={completed}
              onCheckedChange={handleToggleComplete}
              disabled={isLoading}
            />
            <label htmlFor={`edit-task-${id}-completed`} className="text-sm text-gray-700 dark:text-gray-300">
              Mark as completed
            </label>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleSave}
          disabled={isLoading || !editedTitle.trim()}>
          {isLoading ? (
            <>
              <Spinner size={16} className="mr-2 text-white" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
