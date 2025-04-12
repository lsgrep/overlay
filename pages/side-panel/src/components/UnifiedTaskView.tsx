import { useState, useEffect, memo } from 'react';
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
import { useChat } from '../contexts/ChatContext';

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
    // Reset today to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);

    // Get the current day of week
    const dayOfWeek = today.getDay(); // 0-6, with 0 being Sunday

    // Calculate days until Saturday (end of week)
    // If today is Sunday (0), we need 6 more days to Saturday
    // If today is Monday (1), we need 5 more days to Saturday, etc.
    const daysUntilEndOfWeek = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;

    // Set end of week to Saturday
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + daysUntilEndOfWeek);
    endOfWeek.setHours(23, 59, 59, 999);

    // Create a temp date for comparison that matches exact times
    const compareDate = new Date(date);

    return compareDate >= today && compareDate <= endOfWeek;
  };

  const isNextWeek = (date: Date): boolean => {
    const today = new Date();
    // Get the current day of week
    const dayOfWeek = today.getDay(); // 0-6, with 0 being Sunday

    // Calculate days until Saturday (end of week)
    const daysUntilEndOfWeek = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;

    // Set end of this week to Saturday
    const endOfThisWeek = new Date(today);
    endOfThisWeek.setDate(today.getDate() + daysUntilEndOfWeek);
    endOfThisWeek.setHours(23, 59, 59, 999);

    // Calculate the end of next week (7 days after end of this week)
    const endOfNextWeek = new Date(endOfThisWeek);
    endOfNextWeek.setDate(endOfThisWeek.getDate() + 7);
    endOfNextWeek.setHours(23, 59, 59, 999);

    // Calculate the start of next week (1 day after end of this week)
    const startOfNextWeek = new Date(endOfThisWeek);
    startOfNextWeek.setDate(endOfThisWeek.getDate() + 1);
    startOfNextWeek.setHours(0, 0, 0, 0);

    // Create a temp date for comparison
    const compareDate = new Date(date);

    return compareDate >= startOfNextWeek && compareDate <= endOfNextWeek;
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
        // Get the current day of the week (0 = Sunday, 6 = Saturday)
        const dayOfWeek = today.getDay();
        // Calculate days until Saturday (end of week)
        // If today is Sunday (0), we need 6 more days to Saturday
        // If today is Monday (1), we need 5 more days to Saturday, etc.
        const daysUntilEndOfWeek = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + daysUntilEndOfWeek);
        // Set to end of the day
        endOfWeek.setHours(23, 59, 59, 999);
        return endOfWeek;
      },
    },
    {
      label: 'Next week',
      isSelected: selectedDate ? isNextWeek(new Date(selectedDate)) : false,
      getDate: () => {
        const today = new Date();
        // Get the current day of week
        const dayOfWeek = today.getDay(); // 0-6, with 0 being Sunday

        // Calculate days until Saturday (end of week)
        const daysUntilEndOfWeek = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;

        // Set end of this week to Saturday
        const endOfThisWeek = new Date(today);
        endOfThisWeek.setDate(today.getDate() + daysUntilEndOfWeek);

        // Calculate the end of next week (7 days after end of this week)
        const endOfNextWeek = new Date(endOfThisWeek);
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
  contentVersion?: number; // Used to force re-render when content changes
}

export const UnifiedTaskItem: React.FC<UnifiedTaskItemProps> = memo(props => {
  // Handle both direct task object and individual props
  const task: Task = props.task || {
    id: props.id || '',
    taskId: props.id || '',
    title: props.title || '',
    notes: props.notes || '',
    status: props.completed ? 'completed' : 'needsAction',
    due: props.dueDate,
  };

  const { isLight, onUpdate, onDelete, onToggleComplete, onCopy, contentVersion = 0 } = props;

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

  // Update state if task properties change from parent
  useEffect(() => {
    setEditedTask({
      title: task.title,
      notes: task.notes || '',
      due: task.due || '',
    });
  }, [task, contentVersion]);

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
    'border rounded-md overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md relative mb-3 w-full max-w-[95%]',
    'border-border bg-card',
  );

  // View mode
  if (!isEditing) {
    return (
      <Card className={taskCardStyle}>
        <CardHeader className="p-2 pb-0 flex flex-row items-start justify-between gap-1">
          <CardTitle className="text-sm font-medium text-foreground flex items-center">
            {task.due && (
              <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                <CalendarIcon size={12} className="text-primary" />
                Due: {overlayApi.formatDate(task.due)}
              </span>
            )}
          </CardTitle>
          <div className="flex space-x-0.5">
            {onCopy && (
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-5 w-5">
                <Copy className="h-3 w-3" />
              </Button>
            )}
            {onUpdate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-5 w-5"
                disabled={isLoading}>
                <Edit className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={handleDelete} className="h-5 w-5" disabled={isLoading}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-1 overflow-x-hidden">
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
            <div className="flex-1 min-w-0">
              <div onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer">
                <div className="flex items-center">
                  {isCompleted && <CheckSquare size={16} className="text-success mr-2 flex-shrink-0" />}
                  <span
                    className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'} whitespace-pre-wrap break-words`}>
                    {task.title}
                  </span>
                </div>

                {!isExpanded && task.notes && (
                  <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-2 ml-0 break-words">
                    {task.notes}
                  </p>
                )}
              </div>

              {isExpanded && (
                <div className="mt-3 border-t pt-2 border-border">
                  <div className="mb-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                      <FileText size={12} />
                      <span>Notes</span>
                    </div>
                    <div className="p-2 rounded text-sm min-h-[40px] overflow-x-hidden break-words">
                      {task.notes ? task.notes : <span className="text-muted-foreground italic">No notes</span>}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
                <span className="flex-shrink-0">{formattedDate}</span>
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate max-w-[100px] ml-2 break-all">
                    {(() => {
                      try {
                        return new URL(sourceUrl).hostname;
                      } catch {
                        return sourceUrl;
                      }
                    })()}
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
    <Card className={cn(taskCardStyle, 'bg-background relative')}>
      {isLoading && (
        <div className="absolute inset-0 bg-foreground/5 flex items-center justify-center z-10 rounded-md">
          <div className="bg-background rounded-full p-2 shadow-md">
            <Spinner size={24} />
          </div>
        </div>
      )}
      <CardHeader className="p-2 pb-0 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium text-primary flex items-center">
          <Edit className="h-4 w-4 mr-1" /> Edit Task
        </CardTitle>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(false)}
            className="h-5 w-5"
            disabled={isLoading}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 space-y-2">
        <div>
          <label htmlFor="task-title" className="block text-xs font-medium text-muted-foreground mb-1">
            Title
          </label>
          <input
            id="task-title"
            type="text"
            value={editedTask.title || ''}
            onChange={e => handleInputChange('title', e.target.value)}
            className="w-full p-2 border border-input rounded text-sm bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="task-notes" className="block text-xs font-medium text-muted-foreground mb-1">
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
          <label htmlFor="task-due-date" className="block text-xs font-medium text-muted-foreground mb-1">
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
            <label htmlFor={`edit-task-${task.id}-completed`} className="text-sm text-foreground">
              Mark as completed
            </label>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-2 pt-0">
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={handleSave}
          disabled={isLoading || !editedTask.title?.trim()}>
          {isLoading ? (
            <>
              <Spinner size={16} className="mr-2 text-primary-foreground" />
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
});

UnifiedTaskItem.displayName = 'UnifiedTaskItem';

// Task list component
export const UnifiedTaskListView: React.FC<{
  tasks: Task[];
  isLight: boolean;
  onUpdate?: (task: Task) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  onToggleComplete?: (taskId: string, completed: boolean) => Promise<void>;
  contentVersion?: number; // Used to force re-render when content changes
  messageId?: string; // ID of the parent message for context updates
}> = memo(({ tasks, isLight, onUpdate, onDelete, onToggleComplete, contentVersion = 0, messageId }) => {
  // We don't use context directly here, we use the callbacks
  // This component is called by MessageItem which already uses the context
  // Render empty state
  if (tasks.length === 0) {
    return (
      <div className="my-2 w-full">
        <div className="p-4 text-center text-muted-foreground border border-dashed border-border rounded-md bg-muted w-full">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No tasks available</p>
        </div>
      </div>
    );
  }

  // Render task list
  return (
    <div className="my-2 space-y-2 w-full max-w-full overflow-x-hidden px-1">
      {tasks.map(task => (
        <div className="flex justify-center" key={task.id}>
          <UnifiedTaskItem
            task={task}
            isLight={isLight}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onToggleComplete={onToggleComplete}
            contentVersion={contentVersion}
          />
        </div>
      ))}
    </div>
  );
});

UnifiedTaskListView.displayName = 'UnifiedTaskListView';
