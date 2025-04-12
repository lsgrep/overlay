import { useState } from 'react';
import { CheckSquare, Square, Trash2, Edit, X, FileText, Save, CalendarIcon, Loader2 } from 'lucide-react';
import { type Task, overlayApi } from '@extension/shared/lib/services/api';
import { Button, Skeleton, Calendar, Popover, PopoverTrigger, PopoverContent, Badge } from '@extension/ui/lib/ui';
import { cn } from '@extension/ui/lib/utils';

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

// Spinner component for loading states
type SpinnerProps = {
  size?: number;
  className?: string;
};

const Spinner: React.FC<SpinnerProps> = ({ size = 16, className }) => (
  <Loader2 size={size} className={cn('animate-spin text-primary', className)} />
);

// Task status checkbox component
type TaskStatusCheckboxProps = {
  taskId: string;
  status?: string;
  isLoading: boolean;
  onToggle: (taskId: string, currentStatus?: string) => Promise<void>;
};

const TaskStatusCheckbox: React.FC<TaskStatusCheckboxProps> = ({ taskId, status, isLoading, onToggle }) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => onToggle(taskId, status)}
    disabled={isLoading}
    className={`flex-shrink-0 h-6 w-6 mt-0.5 p-0 ${isLoading ? 'opacity-70' : 'hover:scale-110'} transition-transform`}>
    {isLoading ? (
      <Spinner size={16} />
    ) : status === 'completed' ? (
      <CheckSquare size={16} className="text-success" />
    ) : (
      <Square size={16} className="text-muted-foreground/60" />
    )}
  </Button>
);

// Due date display component
type DueDateDisplayProps = {
  dueDate?: string;
  showIcon?: boolean;
  className?: string;
};

const DueDateDisplay: React.FC<DueDateDisplayProps> = ({ dueDate, showIcon = true, className }) => {
  if (!dueDate) return null;

  return (
    <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
      {showIcon && <CalendarIcon size={12} />}
      <span>Due: {overlayApi.formatDate(dueDate)}</span>
    </div>
  );
};

// Task actions component
type TaskActionsProps = {
  taskId: string;
  isExpanded: boolean;
  isEditMode: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
};

const TaskActions: React.FC<TaskActionsProps> = ({
  taskId,
  isExpanded,
  isEditMode,
  isLoading,
  onEdit,
  onSave,
  onDelete,
}) => (
  <div className="flex gap-1">
    {isExpanded && isEditMode ? (
      <Button variant="ghost" size="icon" onClick={onSave} disabled={isLoading} className="h-7 w-7 rounded-full">
        {isLoading ? <Spinner size={14} /> : <Save size={14} className="text-success" />}
      </Button>
    ) : (
      <Button variant="ghost" size="icon" onClick={onEdit} disabled={isLoading} className="h-7 w-7 rounded-full">
        {isEditMode ? (
          <X size={14} className="text-muted-foreground" />
        ) : isExpanded ? (
          <Edit size={14} className="text-primary" />
        ) : (
          <Edit size={14} className="text-muted-foreground" />
        )}
      </Button>
    )}
    <Button
      variant="ghost"
      size="icon"
      onClick={onDelete}
      disabled={isLoading}
      className="h-7 w-7 rounded-full hover:bg-destructive/10">
      {isLoading ? (
        <Spinner size={14} className="text-destructive" />
      ) : (
        <Trash2 size={14} className="text-destructive" />
      )}
    </Button>
  </div>
);

// Date selection quick buttons
type DateQuickButtonsProps = {
  selectedDate?: string | null;
  onSelect: (date: Date | null) => void;
};

const DateQuickButtons: React.FC<DateQuickButtonsProps> = ({ selectedDate, onSelect }) => {
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
          className={`cursor-pointer ${item.isSelected ? 'bg-primary hover:bg-primary/90' : 'hover:bg-primary/10'}`}
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

// Task edit form component
type TaskEditFormProps = {
  task: Task;
  editedTask: Partial<Task> | null;
  isLoading: boolean;
  onInputChange: (field: keyof Task, value: string | Date | null) => void;
  onSave: () => void;
};

const TaskEditForm: React.FC<TaskEditFormProps> = ({ task, editedTask, isLoading, onInputChange, onSave }) => (
  <div className="space-y-3">
    <div>
      <label htmlFor="taskTitle" className="block text-xs font-medium text-muted-foreground mb-1">
        Title
      </label>
      <input
        id="taskTitle"
        type="text"
        value={editedTask?.title || ''}
        onChange={e => onInputChange('title', e.target.value)}
        disabled={isLoading}
        className="w-full p-2 border border-input rounded text-sm bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70"
      />
    </div>
    <div>
      <label htmlFor="taskNotes" className="block text-xs font-medium text-muted-foreground mb-1">
        Notes
      </label>
      <textarea
        id="taskNotes"
        value={editedTask?.notes || ''}
        onChange={e => onInputChange('notes', e.target.value)}
        disabled={isLoading}
        className="w-full p-2 border border-input rounded text-sm bg-background text-foreground min-h-[60px] focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-70"
      />
    </div>
    <div>
      <label htmlFor="taskDueDate" className="block text-xs font-medium text-muted-foreground mb-1">
        Due Date
      </label>
      <div className="flex flex-col">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal bg-background disabled:opacity-70"
              disabled={isLoading}
              id="taskDueDate">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {editedTask?.due ? (
                new Date(editedTask.due).toLocaleDateString()
              ) : (
                <span className="text-muted-foreground">Select a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={editedTask?.due ? new Date(editedTask.due) : undefined}
              onSelect={date => onInputChange('due', date || null)}
              initialFocus
              disabled={isLoading}
            />
          </PopoverContent>
        </Popover>
        <DateQuickButtons selectedDate={editedTask?.due} onSelect={date => onInputChange('due', date)} />
      </div>
    </div>
    <div className="mt-4">
      <Button
        className="w-full py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm disabled:opacity-70"
        onClick={onSave}
        disabled={isLoading}>
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
    </div>
  </div>
);

// Task details view component
type TaskDetailsViewProps = {
  task: Task;
};

const TaskDetailsView: React.FC<TaskDetailsViewProps> = ({ task }) => (
  <>
    <div className="mb-2">
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
        <FileText size={12} />
        <span>Notes</span>
      </div>
      <div className="p-2 rounded text-sm min-h-[40px]">
        {task.notes ? task.notes : <span className="text-muted-foreground/60 italic">No notes</span>}
      </div>
    </div>

    <div className="text-xs text-muted-foreground flex flex-col gap-1 mt-3 pt-2 border-t border-border">
      <div className="flex justify-between">
        <span>Task ID:</span>
        <span className="font-mono">{task.id.substring(0, 12)}...</span>
      </div>
      {task.listId && (
        <div className="flex justify-between">
          <span>List:</span>
          <span className="font-mono">{task.listId.substring(0, 12)}...</span>
        </div>
      )}
    </div>
  </>
);

// Individual task item component
type TaskItemProps = {
  task: Task;
  isLight: boolean;
  isExpanded: boolean;
  isEditMode: boolean;
  isLoading: boolean;
  editedTask: Partial<Task> | null;
  onToggleStatus: (taskId: string, currentStatus?: string) => Promise<void>;
  onToggleExpand: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onSave: (taskId: string) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onInputChange: (field: keyof Task, value: string | Date | null) => void;
};

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isLight,
  isExpanded,
  isEditMode,
  isLoading,
  editedTask,
  onToggleStatus,
  onToggleExpand,
  onEdit,
  onSave,
  onDelete,
  onInputChange,
}) => {
  const taskCardStyle = cn(
    'border rounded-md overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md relative',
    'border-border bg-card',
  );

  const headerStyle = cn('flex items-start gap-2 p-3 transition-colors', 'hover:bg-accent/50');

  const expandedSectionStyle = cn('p-3 border-t', 'border-border bg-accent/50');

  const handleEdit = () => {
    // If already in edit mode, exit edit mode
    if (isEditMode) {
      onToggleExpand(task.id);
      return;
    }

    // Enter edit mode (this will also expand if not already expanded)
    onEdit(task);
  };

  return (
    <div className={taskCardStyle}>
      {/* Loading overlay for full task edits */}
      {isLoading && isEditMode && (
        <div className="absolute inset-0 bg-black/5 dark:bg-black/20 flex items-center justify-center z-10 rounded-md">
          <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-md">
            <Spinner size={24} />
          </div>
        </div>
      )}

      <div className={headerStyle}>
        <TaskStatusCheckbox
          taskId={task.id}
          status={task.status}
          isLoading={isLoading && !isEditMode}
          onToggle={onToggleStatus}
        />

        <button
          className="flex-1 cursor-pointer text-left"
          onClick={() => onToggleExpand(task.id)}
          onKeyDown={e => e.key === 'Enter' && onToggleExpand(task.id)}
          disabled={isLoading}
          tabIndex={0}
          aria-expanded={isExpanded}>
          <p className={cn('text-sm font-medium', isLoading && 'opacity-70')}>{task.title}</p>
          {task.due && <DueDateDisplay dueDate={task.due} className="mt-1" />}
        </button>

        <TaskActions
          taskId={task.id}
          isExpanded={isExpanded}
          isEditMode={isEditMode}
          isLoading={isLoading}
          onEdit={handleEdit}
          onSave={() => onSave(task.id)}
          onDelete={() => onDelete(task.id)}
        />
      </div>

      {isExpanded && (
        <div className={expandedSectionStyle}>
          {isEditMode ? (
            <TaskEditForm
              task={task}
              editedTask={editedTask}
              isLoading={isLoading}
              onInputChange={onInputChange}
              onSave={() => onSave(task.id)}
            />
          ) : (
            <TaskDetailsView task={task} />
          )}
        </div>
      )}
    </div>
  );
};

// Main task list component
export const TaskListView: React.FC<{ tasks: Task[]; isLight: boolean }> = ({ tasks: initialTasks, isLight }) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editedTask, setEditedTask] = useState<Partial<Task> | null>(null);

  // Toggle task completion status
  const toggleTaskStatus = async (taskId: string, currentStatus: string | undefined) => {
    if (loading[taskId]) return;

    const newStatus = currentStatus === 'completed' ? 'needsAction' : 'completed';
    setLoading(prev => ({ ...prev, [taskId]: true }));

    try {
      await overlayApi.updateTask(taskId, { status: newStatus });
      setTasks(prevTasks => prevTasks.map(task => (task.id === taskId ? { ...task, status: newStatus } : task)));
    } catch (error) {
      console.error('Error updating task status:', error);
    } finally {
      setLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Delete a task
  const deleteTask = async (taskId: string) => {
    if (loading[taskId]) return;

    setLoading(prev => ({ ...prev, [taskId]: true }));

    try {
      await overlayApi.deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Toggle expanded view for a task
  const toggleExpandTask = (taskId: string) => {
    if (loading[taskId]) return; // Don't toggle when loading
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
    setEditMode(null); // Exit edit mode when collapsing
  };

  // Enter edit mode for a task
  const enterEditMode = (task: Task) => {
    if (loading[task.id]) return; // Don't enter edit mode when loading
    setExpandedTaskId(task.id); // Ensure task is expanded
    setEditMode(task.id);
    setEditedTask({
      title: task.title,
      notes: task.notes || '',
      due: task.due || '',
    });
  };

  // Handle input changes for editable fields
  const handleInputChange = (field: keyof Task, value: string | Date | null) => {
    if (editedTask) {
      if (field === 'due' && value instanceof Date) {
        setEditedTask(prev => ({ ...prev, [field]: value.toISOString() }));
      } else {
        setEditedTask(prev => ({ ...prev, [field]: value }));
      }
    }
  };

  // Save edited task
  const saveTask = async (taskId: string) => {
    if (!editedTask || loading[taskId]) return;
    setLoading(prev => ({ ...prev, [taskId]: true }));

    try {
      const formattedTask = {
        ...editedTask,
        due: editedTask.due ? new Date(editedTask.due).toISOString() : undefined,
      };

      await overlayApi.updateTask(taskId, formattedTask);
      setTasks(prevTasks => prevTasks.map(task => (task.id === taskId ? { ...task, ...editedTask } : task)));
      setEditMode(null);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Render empty state
  if (tasks.length === 0) {
    return (
      <div className="my-2">
        <div className="p-4 text-center text-muted-foreground border border-dashed border-border rounded-md bg-muted">
          No tasks available
        </div>
      </div>
    );
  }

  // Render task list
  return (
    <div className="my-2 space-y-3">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          isLight={isLight}
          isExpanded={expandedTaskId === task.id}
          isEditMode={editMode === task.id}
          isLoading={loading[task.id] || false}
          editedTask={editedTask}
          onToggleStatus={toggleTaskStatus}
          onToggleExpand={toggleExpandTask}
          onEdit={enterEditMode}
          onSave={saveTask}
          onDelete={deleteTask}
          onInputChange={handleInputChange}
        />
      ))}
    </div>
  );
};

// Component for task-based messages
export const TaskMessageContent: React.FC<{
  tasks: Task[];
  isLight: boolean;
}> = ({ tasks, isLight }) => {
  return <TaskListView tasks={tasks} isLight={isLight} />;
};

export type { Task };
