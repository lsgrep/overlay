import { useState, useEffect } from 'react';
import { CheckSquare, Square, Trash2, Edit, X, FileText, Save, CalendarIcon, Loader2, Copy } from 'lucide-react';
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
  Badge,
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

// Date selection quick buttons
type DateQuickButtonsProps = {
  selectedDate?: string | null;
  onSelect: (date: Date | null) => void;
};

const DateQuickButtons: React.FC<DateQuickButtonsProps> = ({ selectedDate, onSelect }) => {
  // Date utility functions
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isToday = (date: Date): boolean => isSameDay(new Date(), date);

  const isTomorrow = (date: Date): boolean => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameDay(tomorrow, date);
  };

  const isThisWeek = (date: Date): boolean => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilEndOfWeek = 6 - dayOfWeek; // 0-6, with 6 being Saturday
    const endOfWeek = new Date();
    endOfWeek.setDate(today.getDate() + daysUntilEndOfWeek);
    endOfWeek.setHours(23, 59, 59, 999);
    return date >= today && date <= endOfWeek;
  };

  const isNextWeek = (date: Date): boolean => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilEndOfWeek = 6 - dayOfWeek;
    const endOfThisWeek = new Date();
    endOfThisWeek.setDate(today.getDate() + daysUntilEndOfWeek);
    endOfThisWeek.setHours(23, 59, 59, 999);
    const endOfNextWeek = new Date();
    endOfNextWeek.setDate(endOfThisWeek.getDate() + 7);
    return date > endOfThisWeek && date <= endOfNextWeek;
  };

  const quickDates = [
    {
      label: 'Today',
      isSelected: selectedDate ? isToday(new Date(selectedDate)) : false,
      getDate: () => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return today;
      },
    },
    {
      label: 'Tomorrow',
      isSelected: selectedDate ? isTomorrow(new Date(selectedDate)) : false,
      getDate: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);
        return tomorrow;
      },
    },
    {
      label: 'This week',
      isSelected: selectedDate ? isThisWeek(new Date(selectedDate)) : false,
      getDate: () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysUntilEndOfWeek = 6 - dayOfWeek;
        const endOfWeek = new Date();
        endOfWeek.setDate(today.getDate() + daysUntilEndOfWeek);
        endOfWeek.setHours(23, 59, 59, 999);
        return endOfWeek;
      },
    },
    {
      label: 'Next week',
      isSelected: selectedDate ? isNextWeek(new Date(selectedDate)) : false,
      getDate: () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysUntilEndOfWeek = 6 - dayOfWeek;
        const endOfThisWeek = new Date();
        endOfThisWeek.setDate(today.getDate() + daysUntilEndOfWeek);
        const endOfNextWeek = new Date();
        endOfNextWeek.setDate(endOfThisWeek.getDate() + 7);
        endOfNextWeek.setHours(23, 59, 59, 999);
        return endOfNextWeek;
      },
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {quickDates.map(item => (
        <Badge
          key={item.label}
          variant={item.isSelected ? 'default' : 'secondary'}
          className={`cursor-pointer ${
            item.isSelected ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-100 dark:hover:bg-blue-900'
          }`}
          onClick={() => onSelect(item.getDate())}>
          {item.label}
        </Badge>
      ))}
      {selectedDate && (
        <Badge
          variant="outline"
          className="cursor-pointer text-destructive hover:bg-destructive/10"
          onClick={() => onSelect(null)}>
          Clear date
        </Badge>
      )}
    </div>
  );
};

export interface UnifiedTaskItemProps {
  task: Task;
  isLight: boolean;
  onUpdate?: (task: Task) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  onToggleComplete?: (taskId: string, completed: boolean) => Promise<void>;
  onCopy?: () => void;
  // For system message compatibility
  id?: string;
  title?: string;
  notes?: string;
  timestamp?: number;
  sourceUrl?: string;
  completed?: boolean;
  dueDate?: string;
}

export const UnifiedTaskItem: React.FC<UnifiedTaskItemProps> = props => {
  // Handle both direct task object and individual props
  const task: Task = props.task || {
    id: props.id || '',
    taskId: props.id || '',
    title: props.title || '',
    notes: props.notes || '',
    status: props.completed ? 'completed' : 'needsAction',
    due: props.dueDate,
  };

  const { isLight, onUpdate, onDelete, onToggleComplete, onCopy } = props;

  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({
    title: task.title,
    notes: task.notes || '',
    due: task.due || '',
  });

  // Format date for display
  const formattedDate = props.timestamp ? new Date(props.timestamp).toLocaleString() : '';

  const sourceUrl = props.sourceUrl || '';
  const isCompleted = task.status === 'completed' || props.completed;

  // Handle edit mode changes
  useEffect(() => {
    // Reset form when cancelling edit mode
    if (!isEditing) {
      setEditedTask({
        title: task.title,
        notes: task.notes || '',
        due: task.due || '',
      });
    }
  }, [isEditing, task.title, task.notes, task.due]);

  // Handle toggle completion
  const handleToggleComplete = async () => {
    if (!onToggleComplete) return;

    setIsLoading(true);
    try {
      await onToggleComplete(task.id, !isCompleted);
    } catch (error) {
      console.error('Error toggling task completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle copy
  const handleCopy = () => {
    navigator.clipboard.writeText(task.title);
    if (onCopy) onCopy();
  };

  // Handle delete
  const handleDelete = async () => {
    if (!onDelete) return;

    setIsLoading(true);
    try {
      await onDelete(task.id);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!onUpdate) return;

    setIsLoading(true);
    try {
      const updatedTask: Task = {
        ...task,
        title: editedTask.title || task.title,
        notes: editedTask.notes,
        due: editedTask.due,
      };

      await onUpdate(updatedTask);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setEditedTask(prev => ({
      ...prev,
      due: date?.toISOString(),
    }));
  };

  // Handle input changes
  const handleInputChange = (field: keyof Task, value: string | Date | null) => {
    if (field === 'due' && value instanceof Date) {
      setEditedTask(prev => ({ ...prev, [field]: value.toISOString() }));
    } else {
      setEditedTask(prev => ({ ...prev, [field]: value }));
    }
  };

  // Task card styles
  const taskCardStyle = cn(
    'border rounded-md overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md relative mb-3 w-full',
    isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
  );

  // View mode
  if (!isEditing) {
    return (
      <Card className={taskCardStyle}>
        <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
            {task.due && (
              <span className="text-xs text-gray-500 font-normal flex items-center gap-1">
                <CalendarIcon size={12} className="text-blue-500" />
                Due: {overlayApi.formatDate(task.due)}
              </span>
            )}
          </CardTitle>
          <div className="flex space-x-1">
            {onCopy && (
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-6 w-6">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
            {onUpdate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6"
                disabled={isLoading}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={handleDelete} className="h-6 w-6" disabled={isLoading}>
                <Trash2 className="h-3.5 w-3.5" />
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
                  <Checkbox id={`task-${task.id}`} checked={isCompleted} onCheckedChange={handleToggleComplete} />
                )}
              </div>
            )}
            <div className="flex-1">
              <div onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer">
                <div className="flex items-center">
                  {isCompleted && <CheckSquare size={16} className="text-green-500 mr-2 flex-shrink-0" />}
                  <span
                    className={`text-sm font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-300'} whitespace-pre-wrap`}>
                    {task.title}
                  </span>
                </div>

                {!isExpanded && task.notes && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-2 ml-0">
                    {task.notes}
                  </p>
                )}
              </div>

              {isExpanded && (
                <div className="mt-3 border-t pt-2 border-gray-200 dark:border-gray-700">
                  <div className="mb-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                      <FileText size={12} />
                      <span>Notes</span>
                    </div>
                    <div className="p-2 rounded text-sm min-h-[40px]">
                      {task.notes ? task.notes : <span className="text-gray-400 italic">No notes</span>}
                    </div>
                  </div>
                </div>
              )}

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
    <Card className={cn(taskCardStyle, 'bg-white dark:bg-slate-800 relative')}>
      {isLoading && (
        <div className="absolute inset-0 bg-black/5 dark:bg-black/20 flex items-center justify-center z-10 rounded-md">
          <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-md">
            <Spinner size={24} />
          </div>
        </div>
      )}
      <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center">
          <Edit className="h-4 w-4 mr-1" /> Edit Task
        </CardTitle>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(false)}
            className="h-6 w-6"
            disabled={isLoading}>
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
            value={editedTask.title || ''}
            onChange={e => handleInputChange('title', e.target.value)}
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
            value={editedTask.notes || ''}
            onChange={e => handleInputChange('notes', e.target.value)}
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
                {editedTask.due ? (
                  overlayApi.formatDate(editedTask.due)
                ) : (
                  <span className="text-muted-foreground">Select a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={editedTask.due ? new Date(editedTask.due) : undefined}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <DateQuickButtons selectedDate={editedTask.due} onSelect={date => handleInputChange('due', date)} />
        </div>

        {onToggleComplete && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`edit-task-${task.id}-completed`}
              checked={isCompleted}
              onCheckedChange={handleToggleComplete}
              disabled={isLoading}
            />
            <label htmlFor={`edit-task-${task.id}-completed`} className="text-sm text-gray-700 dark:text-gray-300">
              Mark as completed
            </label>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handleSave}
          disabled={isLoading || !editedTask.title?.trim()}>
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

// Task list component
export const UnifiedTaskListView: React.FC<{
  tasks: Task[];
  isLight: boolean;
  onUpdate?: (task: Task) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  onToggleComplete?: (taskId: string, completed: boolean) => Promise<void>;
}> = ({ tasks, isLight, onUpdate, onDelete, onToggleComplete }) => {
  // Render empty state
  if (tasks.length === 0) {
    return (
      <div className="my-2 w-full">
        <div className="p-4 text-center text-gray-500 border border-dashed rounded-md bg-gray-50 dark:bg-gray-800 w-full">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No tasks available</p>
        </div>
      </div>
    );
  }

  // Render task list
  return (
    <div className="my-2 space-y-2 w-full max-w-full">
      {tasks.map(task => (
        <UnifiedTaskItem
          key={task.id}
          task={task}
          isLight={isLight}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onToggleComplete={onToggleComplete}
        />
      ))}
    </div>
  );
};
