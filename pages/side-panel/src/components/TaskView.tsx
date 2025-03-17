import { useState } from 'react';
import { CheckSquare, Square, Trash2, Edit, X, FileText, Clock, Save, CalendarIcon } from 'lucide-react';
import { type Task, overlayApi, type UpdateTaskData } from '@extension/shared/lib/services/api';
import { Button, Skeleton, Calendar, Popover, PopoverTrigger, PopoverContent, Badge } from '@extension/ui/lib/ui';
import { cn } from '@extension/ui/lib/utils';

// Helper functions for date comparisons
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return isSameDay(today, date);
};

const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(tomorrow, date);
};

const isThisWeek = (date: Date): boolean => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilEndOfWeek = 7 - dayOfWeek - 1;
  const endOfWeek = new Date();
  endOfWeek.setDate(today.getDate() + daysUntilEndOfWeek);
  endOfWeek.setHours(23, 59, 59, 999);
  return date >= today && date <= endOfWeek;
};

const isNextWeek = (date: Date): boolean => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilEndOfWeek = 7 - dayOfWeek - 1;
  const endOfThisWeek = new Date();
  endOfThisWeek.setDate(today.getDate() + daysUntilEndOfWeek);
  endOfThisWeek.setHours(23, 59, 59, 999);
  const endOfNextWeek = new Date();
  endOfNextWeek.setDate(today.getDate() + daysUntilEndOfWeek + 7);
  endOfNextWeek.setHours(23, 59, 59, 999);
  return date > endOfThisWeek && date <= endOfNextWeek;
};

// ========================
// Task-specific Components
// ========================

// Component to render a task list
export const TaskListView: React.FC<{ tasks: Task[]; isLight: boolean }> = ({ tasks: initialTasks, isLight }) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editedTask, setEditedTask] = useState<Partial<Task> | null>(null);

  // Toggle task completion status
  const toggleTaskStatus = async (taskId: string, currentStatus: string | undefined) => {
    // Skip if already loading this task
    if (loading[taskId]) return;

    const newStatus = currentStatus === 'completed' ? 'needsAction' : 'completed';
    setLoading(prev => ({ ...prev, [taskId]: true }));

    try {
      const updateData: UpdateTaskData = {
        taskId,
        status: newStatus as 'completed' | 'needsAction',
      };

      // Call API to update task status
      await overlayApi.updateTaskStatus(updateData);

      // Update local state
      setTasks(prevTasks => prevTasks.map(task => (task.id === taskId ? { ...task, status: newStatus } : task)));
    } catch (error) {
      console.error('Error updating task status:', error);
      // Could add error handling UI here
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
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
    setEditMode(null); // Exit edit mode when collapsing
    console.log('Task expanded state:', taskId, expandedTaskId === taskId ? 'collapsed' : 'expanded');
  };

  // Enter edit mode for a task
  const enterEditMode = (task: Task) => {
    setExpandedTaskId(task.id); // Ensure task is expanded
    setEditMode(task.id);
    setEditedTask({
      title: task.title,
      notes: task.notes || '',
      due: task.due || '',
    });
    console.log('Edit mode entered for task:', task.id);
  };

  // Handle input changes for editable fields
  const handleInputChange = (field: keyof Task, value: string | Date | null) => {
    if (editedTask) {
      // If it's a Date object (from Calendar), convert to ISO string
      if (field === 'due' && value instanceof Date) {
        setEditedTask(prev => ({ ...prev, [field]: value.toISOString() }));
      } else {
        setEditedTask(prev => ({ ...prev, [field]: value }));
      }
    }
  };

  // Save edited task
  const saveTask = async (taskId: string) => {
    if (!editedTask) return;
    setLoading(prev => ({ ...prev, [taskId]: true }));

    try {
      // Format the date properly if it exists
      const formattedTask = {
        ...editedTask,
        due: editedTask.due ? new Date(editedTask.due).toISOString() : undefined,
      };

      await overlayApi.updateTask(taskId, formattedTask);
      // Update local state
      setTasks(prevTasks => prevTasks.map(task => (task.id === taskId ? { ...task, ...editedTask } : task)));
      // Exit edit mode
      setEditMode(null);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  return (
    <div className="my-2">
      {tasks.length === 0 ? (
        <div className="p-4 text-center text-gray-500 border border-dashed rounded-md bg-gradient-to-b from-background to-muted/30 dark:from-gray-900 dark:to-gray-800">
          No tasks available
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div
              key={task.id}
              className={cn(
                'border rounded-md overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md',
                isLight
                  ? 'border-blue-100 bg-gradient-to-b from-white to-blue-50/30'
                  : 'border-blue-800/40 bg-gradient-to-b from-gray-800 to-gray-900/70',
              )}>
              <div className="flex items-start gap-2 p-3 transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleTaskStatus(task.id, task.status)}
                  disabled={loading[task.id]}
                  className={`flex-shrink-0 h-6 w-6 mt-0.5 p-0 ${loading[task.id] ? 'opacity-50' : 'hover:scale-110'} transition-transform`}>
                  {loading[task.id] ? (
                    <Skeleton className="h-4 w-4 rounded-sm" />
                  ) : task.status === 'completed' ? (
                    <CheckSquare size={16} className="text-green-500" />
                  ) : (
                    <Square size={16} className="text-gray-400" />
                  )}
                </Button>

                <button
                  className="flex-1 cursor-pointer text-left"
                  onClick={() => toggleExpandTask(task.id)}
                  onKeyDown={e => e.key === 'Enter' && toggleExpandTask(task.id)}
                  tabIndex={0}
                  aria-expanded={expandedTaskId === task.id}>
                  <p className="text-sm font-medium">{task.title}</p>

                  {task.due && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <CalendarIcon size={12} />
                      <span>Due: {overlayApi.formatDate(task.due)}</span>
                    </div>
                  )}
                </button>

                <div className="flex gap-1">
                  {expandedTaskId === task.id && editMode === task.id ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => saveTask(task.id)}
                      disabled={loading[task.id]}
                      className="h-7 w-7 rounded-full">
                      {loading[task.id] ? (
                        <Skeleton className="h-4 w-4" />
                      ) : (
                        <Save size={14} className="text-green-500" />
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        // If already in edit mode, exit edit mode
                        if (editMode === task.id) {
                          setEditMode(null);
                          return;
                        }

                        // If not expanded, expand first
                        if (expandedTaskId !== task.id) {
                          setExpandedTaskId(task.id);
                        }

                        // Enter edit mode (this will also expand if not already expanded)
                        enterEditMode(task);
                      }}
                      className="h-7 w-7 rounded-full">
                      {editMode === task.id ? (
                        // In edit mode, show X icon
                        <X size={14} className="text-gray-500" />
                      ) : expandedTaskId === task.id ? (
                        // Expanded but not in edit mode, show blue edit icon
                        <Edit size={14} className="text-blue-500" />
                      ) : (
                        // Not expanded, show normal edit icon
                        <Edit size={14} className="text-gray-500" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTask(task.id)}
                    disabled={loading[task.id]}
                    className="h-7 w-7 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20">
                    {loading[task.id] ? (
                      <Skeleton className="h-4 w-4" />
                    ) : (
                      <Trash2 size={14} className="text-red-500" />
                    )}
                  </Button>
                </div>
              </div>

              {expandedTaskId === task.id && (
                <div className="p-3 border-t border-blue-100 dark:border-blue-800/40 bg-gradient-to-b from-blue-50/70 to-blue-50/30 dark:from-blue-900/20 dark:to-blue-900/5">
                  {editMode === task.id ? (
                    // Edit mode - Show editable fields
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="taskTitle" className="block text-xs font-medium text-gray-500 mb-1">
                          Title
                        </label>
                        <input
                          id="taskTitle"
                          type="text"
                          value={editedTask?.title || ''}
                          onChange={e => handleInputChange('title', e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="taskNotes" className="block text-xs font-medium text-gray-500 mb-1">
                          Notes
                        </label>
                        <textarea
                          id="taskNotes"
                          value={editedTask?.notes || ''}
                          onChange={e => handleInputChange('notes', e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 min-h-[60px] focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label htmlFor="taskDueDate" className="block text-xs font-medium text-gray-500 mb-1">
                          Due Date
                        </label>
                        <div className="flex flex-col">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-white dark:bg-gray-800"
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
                                onSelect={date => handleInputChange('due', date || null)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge
                              variant={editedTask?.due && isToday(new Date(editedTask.due)) ? 'default' : 'secondary'}
                              className={`cursor-pointer ${
                                editedTask?.due && isToday(new Date(editedTask.due))
                                  ? 'bg-blue-600 hover:bg-blue-700'
                                  : 'hover:bg-blue-100 dark:hover:bg-blue-900'
                              }`}
                              onClick={() => {
                                const today = new Date();
                                today.setHours(23, 59, 59, 999);
                                handleInputChange('due', today);
                              }}>
                              Today
                            </Badge>
                            <Badge
                              variant={
                                editedTask?.due && isTomorrow(new Date(editedTask.due)) ? 'default' : 'secondary'
                              }
                              className={`cursor-pointer ${
                                editedTask?.due && isTomorrow(new Date(editedTask.due))
                                  ? 'bg-blue-600 hover:bg-blue-700'
                                  : 'hover:bg-blue-100 dark:hover:bg-blue-900'
                              }`}
                              onClick={() => {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                tomorrow.setHours(23, 59, 59, 999);
                                handleInputChange('due', tomorrow);
                              }}>
                              Tomorrow
                            </Badge>
                            <Badge
                              variant={
                                editedTask?.due && isThisWeek(new Date(editedTask.due)) ? 'default' : 'secondary'
                              }
                              className={`cursor-pointer ${
                                editedTask?.due && isThisWeek(new Date(editedTask.due))
                                  ? 'bg-blue-600 hover:bg-blue-700'
                                  : 'hover:bg-blue-100 dark:hover:bg-blue-900'
                              }`}
                              onClick={() => {
                                const today = new Date();
                                const dayOfWeek = today.getDay();
                                const daysUntilEndOfWeek = 7 - dayOfWeek - 1;
                                const endOfWeek = new Date();
                                endOfWeek.setDate(today.getDate() + daysUntilEndOfWeek);
                                endOfWeek.setHours(23, 59, 59, 999);
                                handleInputChange('due', endOfWeek);
                              }}>
                              This week
                            </Badge>
                            <Badge
                              variant={
                                editedTask?.due && isNextWeek(new Date(editedTask.due)) ? 'default' : 'secondary'
                              }
                              className={`cursor-pointer ${
                                editedTask?.due && isNextWeek(new Date(editedTask.due))
                                  ? 'bg-blue-600 hover:bg-blue-700'
                                  : 'hover:bg-blue-100 dark:hover:bg-blue-900'
                              }`}
                              onClick={() => {
                                const today = new Date();
                                const dayOfWeek = today.getDay();
                                const daysUntilEndOfWeek = 7 - dayOfWeek - 1;
                                const endOfNextWeek = new Date();
                                endOfNextWeek.setDate(today.getDate() + daysUntilEndOfWeek + 7);
                                endOfNextWeek.setHours(23, 59, 59, 999);
                                handleInputChange('due', endOfNextWeek);
                              }}>
                              Next week
                            </Badge>
                            {editedTask?.due && (
                              <Badge
                                variant="outline"
                                className="cursor-pointer text-destructive hover:bg-destructive/10"
                                onClick={() => handleInputChange('due', null)}>
                                Clear date
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button
                          className="w-full py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm"
                          onClick={() => saveTask(editMode as string)}>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode - Show task details
                    <>
                      <div className="mb-2">
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                          <FileText size={12} />
                          <span>Notes</span>
                        </div>
                        <div className="p-2 rounded text-sm min-h-[40px]">
                          {task.notes ? task.notes : <span className="text-gray-400 italic">No notes</span>}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 flex flex-col gap-1 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
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
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ========================
// Content Type Components
// ========================

// Component for task-based messages
export const TaskMessageContent: React.FC<{
  tasks: Task[];
  isLight: boolean;
}> = ({ tasks, isLight }) => {
  return <TaskListView tasks={tasks} isLight={isLight} />;
};

export type { Task };
