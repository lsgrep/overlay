import { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { overlayApi, type TaskList, type Task } from '@extension/shared/lib/services/api';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CalendarIcon,
  XMarkIcon as X,
  CheckIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline'; // Added CheckIcon, ArrowUturnLeftIcon
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import {
  Button,
  Checkbox,
  // Dialog removed
  Textarea,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Calendar,
  Label,
  Input,
} from '@extension/ui';

import type { UserPreferences } from '@extension/storage/lib/impl/userPreferencesStorage';

interface TaskManagerProps {
  isLight: boolean;
  userPreferences: UserPreferences | null;
}

// Type for inline edit state
interface InlineEditState {
  title: string;
  notes: string;
  dueDate: Date | undefined;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ isLight, userPreferences }) => {
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(true);
  const [taskListsLoading, setTaskListsLoading] = useState<boolean>(true);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());

  // --- In-Place Editing State ---
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [inlineEditValues, setInlineEditValues] = useState<InlineEditState>({
    title: '',
    notes: '',
    dueDate: undefined,
  });
  const titleInputRef = useRef<HTMLInputElement>(null); // Ref for focusing title input

  // --- State Update Helpers ---
  const addUpdatingTaskId = useCallback((taskId: string) => {
    setUpdatingTaskIds(prev => new Set(prev).add(taskId));
  }, []);

  const removeUpdatingTaskId = useCallback((taskId: string) => {
    setUpdatingTaskIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  }, []);

  // --- Data Fetching ( Largely Unchanged ) ---
  const fetchTasks = useCallback(async (listId: string, skipLoadingIndicator = false) => {
    if (!listId) return;
    if (!skipLoadingIndicator) setTasksLoading(true);
    setError(null);
    try {
      const tasksData = await overlayApi.getTasks(listId);
      setTasks(tasksData);
    } catch (err) {
      setError('Failed to load tasks. Please try again.');
      console.error(`Error fetching tasks for list ${listId}:`, err);
      setTasks([]);
    } finally {
      if (!skipLoadingIndicator) setTasksLoading(false);
    }
  }, []);

  const fetchTaskLists = useCallback(async () => {
    setTaskListsLoading(true);
    setError(null);
    try {
      const lists = await overlayApi.getTaskLists();
      setTaskLists(lists);

      let listToSelect = selectedListId;
      if (!selectedListId && lists.length > 0) {
        const defaultListId = userPreferences?.default_task_list;
        listToSelect = defaultListId && lists.some(l => l.id === defaultListId) ? defaultListId : lists[0].id;
      } else if (selectedListId && !lists.some(l => l.id === selectedListId)) {
        listToSelect = lists.length > 0 ? lists[0].id : '';
      }

      if (listToSelect !== selectedListId) {
        setSelectedListId(listToSelect);
      } else if (!listToSelect && lists.length === 0) {
        setSelectedListId('');
        setTasks([]);
      }
    } catch (err) {
      setError('Failed to load task lists. Please try again.');
      console.error('Error fetching task lists:', err);
      setTaskLists([]);
      setSelectedListId('');
      setTasks([]);
    } finally {
      setTaskListsLoading(false);
    }
  }, [userPreferences, selectedListId]);

  // --- Effects ---
  useEffect(() => {
    fetchTaskLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTaskLists]);

  useEffect(() => {
    // When selected list changes, cancel any ongoing inline edit
    setEditingTaskId(null);
    setTasks([]);
    if (selectedListId) {
      fetchTasks(selectedListId, false);
    } else {
      setTasksLoading(false);
    }
  }, [selectedListId, fetchTasks]);

  // Effect to focus the title input when editing starts
  useEffect(() => {
    if (editingTaskId && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select(); // Select text for easy replacement
    }
  }, [editingTaskId]);

  // --- Event Handlers (CRUD - Create, UpdateStatus, Delete are largely unchanged) ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || !selectedListId) return;
    const tempId = `temp-${Date.now()}`;
    addUpdatingTaskId(tempId);
    setNewTaskTitle('');
    try {
      await overlayApi.createTask({ listId: selectedListId, title });
      await fetchTasks(selectedListId, true);
    } catch (err) {
      setError('Failed to create task. Please try again.');
      console.error('Error creating task:', err);
    } finally {
      removeUpdatingTaskId(tempId);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, completed: boolean) => {
    if (!selectedListId) return;
    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;

    // If the task being edited is checked/unchecked, cancel edit mode first
    if (editingTaskId === taskId) {
      setEditingTaskId(null);
    }

    const originalStatus = taskToUpdate.status;
    const newStatus = completed ? 'completed' : 'needsAction';
    addUpdatingTaskId(taskId);
    setTasks(currentTasks => currentTasks.map(task => (task.id === taskId ? { ...task, status: newStatus } : task)));
    try {
      await overlayApi.updateTask(taskToUpdate.taskId || taskId, { status: newStatus }, selectedListId);
      // Optional: await fetchTasks(selectedListId, true);
    } catch (err) {
      setError('Failed to update task status. Please try again.');
      console.error('Error updating task status:', err);
      setTasks(currentTasks =>
        currentTasks.map(task => (task.id === taskId ? { ...task, status: originalStatus } : task)),
      );
    } finally {
      removeUpdatingTaskId(taskId);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedListId) return;
    const taskToDelete = tasks.find(task => task.id === taskId);
    if (!taskToDelete) return;

    // If the task being edited is deleted, cancel edit mode first
    if (editingTaskId === taskId) {
      setEditingTaskId(null);
    }

    const originalTasks = [...tasks];
    addUpdatingTaskId(taskId);
    setTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
    try {
      await overlayApi.deleteTask(taskToDelete.taskId || taskId, selectedListId);
      // Optional: await fetchTasks(selectedListId, true);
    } catch (err) {
      setError('Failed to delete task. Please try again.');
      console.error('Error deleting task:', err);
      setTasks(originalTasks);
    } finally {
      removeUpdatingTaskId(taskId);
    }
  };

  // --- In-Place Edit Handlers ---
  const startEditingTask = (task: Task) => {
    // Cancel any other edit first
    setEditingTaskId(task.id);
    setInlineEditValues({
      title: task.title,
      notes: task.notes || '',
      dueDate: task.due ? new Date(task.due) : undefined,
    });
  };

  const cancelEditingTask = () => {
    setEditingTaskId(null);
    // No need to reset inlineEditValues here, it's reset when starting edit
  };

  const handleInlineInputChange = (field: keyof InlineEditState, value: string | Date | undefined) => {
    setInlineEditValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveInlineChanges = async () => {
    if (!editingTaskId || !selectedListId) return;

    const trimmedTitle = inlineEditValues.title.trim();
    if (!trimmedTitle) {
      // Optionally show an inline error or just prevent saving
      console.warn('Task title cannot be empty.');
      if (titleInputRef.current) titleInputRef.current.focus(); // Refocus title
      return;
    }

    const originalTask = tasks.find(task => task.id === editingTaskId);
    if (!originalTask) return;

    const formattedDueDate = inlineEditValues.dueDate
      ? inlineEditValues.dueDate.toISOString().split('T')[0] // Format YYYY-MM-DD
      : null; // Send null to clear date

    // 1. Add to updating set
    addUpdatingTaskId(editingTaskId);

    // 2. Optimistic UI Update
    const updatedTaskData = {
      ...originalTask,
      title: trimmedTitle,
      notes: inlineEditValues.notes.trim() || undefined, // Store undefined if empty
      due: formattedDueDate || undefined, // Store undefined if null/cleared
    };
    setTasks(currentTasks => currentTasks.map(task => (task.id === editingTaskId ? updatedTaskData : task)));

    // Exit edit mode immediately for better UX
    const taskIdBeingSaved = editingTaskId; // Capture ID before resetting state
    setEditingTaskId(null);

    try {
      // 3. API Call
      const updatePayload = {
        title: trimmedTitle,
        notes: inlineEditValues.notes.trim() || null, // API expects null to clear
        due: formattedDueDate, // API expects YYYY-MM-DD or null
      };
      await overlayApi.updateTask(originalTask.taskId || taskIdBeingSaved, updatePayload, selectedListId);

      // 4. Success: Fetch to confirm state (Recommended)
      await fetchTasks(selectedListId, true);
    } catch (err) {
      setError('Failed to save task changes. Please try again.');
      console.error('Error saving task changes:', err);

      // 5. Failure: Revert Optimistic Update
      setTasks(currentTasks => currentTasks.map(task => (task.id === taskIdBeingSaved ? originalTask : task)));
      // Optionally re-fetch to ensure consistency
      // await fetchTasks(selectedListId, true);
    } finally {
      // 6. Remove from updating set (use captured ID)
      removeUpdatingTaskId(taskIdBeingSaved);
    }
  };

  const formatTaskDueDate = (dueDate?: string | Date) => {
    if (!dueDate) return null;
    const dateString = typeof dueDate === 'string' ? dueDate : dueDate.toISOString();
    try {
      return overlayApi.formatDate(dateString);
    } catch (e) {
      console.error('Error formatting date:', dueDate, e);
      return 'Invalid Date'; // Fallback for invalid date strings
    }
  };

  // --- Loading/Updating Indicator Logic (Unchanged) ---
  const isAnythingLoading = tasksLoading || taskListsLoading;
  const isUpdating = updatingTaskIds.size > 0;
  const showGlobalSpinner = isAnythingLoading || isUpdating;

  const getGlobalLoadingText = () => {
    if (taskListsLoading) return 'Loading task lists...';
    if (tasksLoading) return 'Loading tasks...';
    if (isUpdating) return `Processing update${updatingTaskIds.size > 1 ? 's' : ''}...`;
    return '';
  };

  return (
    <div className="w-full max-w-6xl mx-auto relative z-10">
      {/* Header and Global Loading Indicator */}
      <div className="flex items-center mb-6">
        <h2 className="text-xl font-semibold">Your Tasks</h2>
        {showGlobalSpinner && (
          <div className="ml-3 flex items-center h-6 transition-all duration-300">
            <ArrowPathIcon className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="ml-2 text-sm text-indigo-500 whitespace-nowrap">{getGlobalLoadingText()}</span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div
          className={`mb-4 p-3 rounded-lg border ${isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-900/10 border-red-800/30 text-red-400'}`}>
          {error}{' '}
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-2">
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`space-y-8 p-4 md:p-8 rounded-lg border ${isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'}`}>
        {' '}
        {/* Reduced padding on small screens */}
        {/* Task Lists Tabs */}
        {!taskListsLoading && taskLists.length > 0 && (
          <div className="mb-6">
            <div className="flex overflow-x-auto space-x-1 pb-2 border-b border-border">
              {taskLists.map(list => (
                <Button
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  variant={selectedListId === list.id ? 'secondary' : 'ghost'}
                  className={`whitespace-nowrap px-3 py-1.5 md:px-4 md:py-2 rounded-none border-b-2 text-sm md:text-base ${
                    /* Adjusted padding/text size */
                    selectedListId === list.id
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}>
                  {list.title}
                </Button>
              ))}
            </div>
          </div>
        )}
        {/* Loading/No Lists Message */}
        {taskListsLoading && (
          <p className={`text-sm text-center py-8 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            Loading task lists...
          </p>
        )}
        {!taskListsLoading && taskLists.length === 0 && !error && (
          <p className={`text-sm text-center py-8 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            No task lists found. Create one in Google Tasks.
          </p>
        )}
        {/* Task List Content */}
        {selectedListId && !taskListsLoading && (
          <div>
            {/* New Task Form */}
            <form onSubmit={handleCreateTask} className="mb-6 flex">
              <div className="flex-grow relative">
                <Input
                  type="text"
                  placeholder="Add a new task and press Enter..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full p-2 rounded-r-none border-r-0"
                  disabled={isUpdating}
                  aria-label="New task title"
                />
              </div>
              <Button
                type="submit"
                disabled={!newTaskTitle.trim() || isUpdating}
                variant="default"
                size="icon"
                className="rounded-l-none rounded-r-md bg-indigo-500 hover:bg-indigo-600 h-auto px-3 md:px-4" /* Adjusted padding */
                aria-label="Add task">
                <PlusIcon className="w-5 h-5" />
              </Button>
            </form>

            {/* Tasks List Area */}
            {tasksLoading ? (
              <p className={`text-center py-8 font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                Loading tasks...
              </p>
            ) : tasks.length === 0 ? (
              <p className={`text-center py-8 font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                No tasks in this list. Add one above!
              </p>
            ) : (
              <ul className="space-y-2">
                {' '}
                {/* Slightly reduced spacing */}
                {tasks.map(task => {
                  const isTaskUpdating = updatingTaskIds.has(task.id) || updatingTaskIds.has(task.taskId || '');
                  const isCompleted = task.status === 'completed';
                  const isBeingEdited = editingTaskId === task.id;

                  return (
                    <li
                      key={task.id}
                      className={`rounded-lg transition-all duration-200 border ${
                        isBeingEdited
                          ? isLight
                            ? 'bg-indigo-50 border-indigo-200'
                            : 'bg-indigo-900/20 border-indigo-700/30' // Highlight editing task
                          : isLight
                            ? 'bg-white hover:bg-gray-50 border-gray-200'
                            : 'bg-gray-900/40 hover:bg-gray-900/50 border-gray-800/30'
                      } ${isCompleted && !isBeingEdited ? 'opacity-60' : ''} ${isTaskUpdating && !isBeingEdited ? 'opacity-70 bg-muted/30' : ''}`}>
                      {/* === IN-PLACE EDITING UI === */}
                      {isBeingEdited ? (
                        <div className="p-3 space-y-3">
                          {/* Edit Title */}
                          <Input
                            ref={titleInputRef} // Assign ref here
                            value={inlineEditValues.title}
                            onChange={e => handleInlineInputChange('title', e.target.value)}
                            placeholder="Task title"
                            className="text-md font-medium w-full" // Match display font size
                            disabled={isTaskUpdating}
                            aria-label="Edit task title"
                          />
                          {/* Edit Notes */}
                          <Textarea
                            value={inlineEditValues.notes}
                            onChange={e => handleInlineInputChange('notes', e.target.value)}
                            placeholder="Add notes..."
                            className="text-sm w-full min-h-[60px] resize-y" // Match display size
                            disabled={isTaskUpdating}
                            aria-label="Edit task notes"
                          />
                          {/* Edit Due Date */}
                          <div className="flex items-center space-x-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={`w-full justify-start text-left font-normal ${!inlineEditValues.dueDate ? 'text-muted-foreground' : ''}`}
                                  disabled={isTaskUpdating}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {inlineEditValues.dueDate ? (
                                    formatTaskDueDate(inlineEditValues.dueDate)
                                  ) : (
                                    <span>Set due date</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={inlineEditValues.dueDate}
                                  onSelect={date => handleInlineInputChange('dueDate', date)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            {inlineEditValues.dueDate && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleInlineInputChange('dueDate', undefined)}
                                disabled={isTaskUpdating}
                                aria-label="Clear due date">
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {/* Save/Cancel Buttons */}
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditingTask}
                              disabled={isTaskUpdating}
                              aria-label="Cancel edit">
                              <ArrowUturnLeftIcon className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-indigo-500 hover:bg-indigo-600 text-white"
                              onClick={handleSaveInlineChanges}
                              disabled={isTaskUpdating || !inlineEditValues.title.trim()} // Disable if updating or title empty
                              aria-label="Save changes">
                              {isTaskUpdating ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckIcon className="h-4 w-4 mr-1" /> Save
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* === DISPLAY UI === */
                        <div className="p-3 flex items-start gap-3">
                          {/* Checkbox and Spinner */}
                          <div className="mt-1 flex-shrink-0 w-4 h-4 relative">
                            <Checkbox
                              id={`task-${task.id}`}
                              checked={isCompleted}
                              onCheckedChange={checked => handleUpdateTaskStatus(task.id, Boolean(checked))}
                              disabled={isTaskUpdating || isBeingEdited} // Disable if editing
                              className={`${isTaskUpdating ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                              aria-labelledby={`task-label-${task.id}`} // Reference label for accessibility
                            />
                            {isTaskUpdating && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <ArrowPathIcon className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                              </div>
                            )}
                          </div>

                          {/* Task Content */}
                          <div className="flex-grow">
                            <label
                              id={`task-label-${task.id}`} // ID for aria-labelledby
                              htmlFor={`task-${task.id}`} // Associates label with checkbox
                              className={`text-md font-medium cursor-pointer ${isCompleted ? (isLight ? 'text-gray-500 line-through' : 'text-gray-500 line-through') : isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                              {task.title}
                            </label>

                            {task.notes && (
                              <p
                                className={`mt-1 text-sm whitespace-pre-wrap ${isCompleted ? (isLight ? 'text-gray-400' : 'text-gray-500') : isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                {task.notes}
                              </p>
                            )}

                            {task.due && (
                              <div
                                className={`flex items-center mt-1 text-xs ${
                                  !isCompleted && new Date(task.due) < new Date(new Date().setHours(0, 0, 0, 0)) // Overdue check
                                    ? 'text-red-500 font-medium'
                                    : isCompleted
                                      ? isLight
                                        ? 'text-gray-400'
                                        : 'text-gray-500'
                                      : isLight
                                        ? 'text-indigo-600'
                                        : 'text-indigo-400'
                                }`}>
                                <CalendarIcon
                                  className={`w-3.5 h-3.5 mr-1 ${isCompleted ? 'text-gray-400 dark:text-gray-600' : 'text-indigo-500'}`}
                                />
                                <span>
                                  {formatTaskDueDate(task.due)}
                                  {!isCompleted && new Date(task.due) < new Date(new Date().setHours(0, 0, 0, 0))
                                    ? ' (Overdue)'
                                    : ''}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-1 ml-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startEditingTask(task)}
                              disabled={isTaskUpdating || isCompleted} // Disable edit on completed tasks? Your choice.
                              aria-label="Edit task">
                              <PencilIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDeleteTask(task.id)}
                              disabled={isTaskUpdating}
                              aria-label="Delete task">
                              <TrashIcon className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Dialog component removed */}
    </div>
  );
};
