import { useState, useEffect, useCallback, useRef } from 'react';
import { t } from '@extension/i18n';
import { motion } from 'framer-motion';
import { LoadingDots } from './UI/LoadingDots';
import { overlayApi, type TaskList, type Task, type CreateTaskListData } from '@extension/shared/lib/services/api';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CalendarIcon,
  XMarkIcon as X,
  CheckIcon,
  ArrowUturnLeftIcon,
  PlusCircleIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
  Label,
  Input,
} from '@extension/ui';

import { userPreferencesStorage } from '@extension/storage';
import type { UserPreferences } from '@extension/storage/lib/impl/userPreferencesStorage';

interface TaskManagerProps {
  userPreferences: UserPreferences | null;
}

// Type for inline edit state
interface InlineEditState {
  title: string;
  notes: string;
  dueDate: Date | undefined;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ userPreferences }) => {
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(true);
  const [taskListsLoading, setTaskListsLoading] = useState<boolean>(true);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());
  const [newListTitle, setNewListTitle] = useState<string>('');
  const [isNewListDialogOpen, setIsNewListDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [taskListToDelete, setTaskListToDelete] = useState<TaskList | null>(null);
  const [processingLists, setProcessingLists] = useState<boolean>(false);

  // --- In-Place Editing State ---
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [inlineEditValues, setInlineEditValues] = useState<InlineEditState>({
    title: '',
    notes: '',
    dueDate: undefined,
  });
  const titleInputRef = useRef<HTMLInputElement>(null); // Ref for focusing title input
  const newListTitleInputRef = useRef<HTMLInputElement>(null); // Ref for focusing new list title input

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

  // --- Data Fetching ---
  const fetchTasks = useCallback(async (listId: string, skipLoadingIndicator = false) => {
    if (!listId) return;
    if (!skipLoadingIndicator) setTasksLoading(true);
    setError(null);
    try {
      // Use the overlayApi with the listId
      // The API now includes a cache-busting mechanism
      const tasksData = await overlayApi.getTasks(listId);
      setTasks(tasksData);
    } catch (err) {
      setError(t('task_error_loading_tasks'));
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
      setError(t('task_error_loading_lists'));
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

  // Effect to focus the new list title input when the dialog opens
  useEffect(() => {
    if (isNewListDialogOpen && newListTitleInputRef.current) {
      setTimeout(() => {
        if (newListTitleInputRef.current) {
          newListTitleInputRef.current.focus();
        }
      }, 100); // Small delay to ensure the dialog is fully rendered
    }
  }, [isNewListDialogOpen]);

  // --- Task List Management Handlers ---
  // Handle creating a new task list
  const handleCreateTaskList = async () => {
    const title = newListTitle.trim();
    if (!title) return;

    setProcessingLists(true);
    setIsNewListDialogOpen(false);

    try {
      // Create the task list
      const newList = await overlayApi.createTaskList({ title });

      // Refresh the task lists to include the new one
      await fetchTaskLists();

      // Select the newly created list
      setSelectedListId(newList.id);

      // Reset the input
      setNewListTitle('');
    } catch (err) {
      setError(t('task_error_creating_list', 'Error creating task list'));
      console.error('Error creating task list:', err);
    } finally {
      setProcessingLists(false);
    }
  };

  // Handle deleting a task list
  const handleDeleteTaskList = async (listId: string) => {
    if (!listId) return;

    setProcessingLists(true);
    setIsDeleteDialogOpen(false);

    try {
      // Store the current lists for optimistic UI update
      const currentLists = [...taskLists];
      const deletedList = currentLists.find(list => list.id === listId);
      const isCurrentlySelected = selectedListId === listId;

      // Delete the task list
      await overlayApi.deleteTaskList(listId);

      // Refresh the task lists
      await fetchTaskLists();

      // If we were deleting the currently selected list, select another one
      if (isCurrentlySelected) {
        // Find the index of the deleted list in the original array
        const deletedIndex = currentLists.findIndex(list => list.id === listId);

        // Select an appropriate list if available
        if (currentLists.length > 1) {
          const newIndex = Math.max(0, deletedIndex - 1); // Select previous or first item
          const newSelectedId = currentLists[newIndex]?.id;
          if (newSelectedId && newSelectedId !== listId) {
            // Delay selection to allow DOM to update
            setTimeout(() => {
              setSelectedListId(newSelectedId);
            }, 50);
          }
        }
      }

      // Reset the task list to delete
      setTaskListToDelete(null);
    } catch (err) {
      setError(t('task_error_deleting_list', 'Error deleting task list'));
      console.error('Error deleting task list:', err);
    } finally {
      setProcessingLists(false);
    }
  };

  // Handle confirming the deletion of a task list
  const confirmDeleteTaskList = (list: TaskList) => {
    setTaskListToDelete(list);
    setIsDeleteDialogOpen(true);
  };

  // Handle setting a task list as the default list
  const handleSetDefaultList = async (listId: string) => {
    setProcessingLists(true);
    try {
      const result = await overlayApi.setDefaultTaskList(listId);
      if (result.success) {
        // Update the local user preferences
        if (userPreferences) {
          userPreferencesStorage.set({
            ...userPreferences,
            default_task_list: listId,
          });
        }
        // Show a brief success message
        setError(t('task_default_list_set_success', 'Default list set successfully'));
        setTimeout(() => {
          if (error === t('task_default_list_set_success', 'Default list set successfully')) {
            setError(null);
          }
        }, 3000);
      } else {
        setError(t('task_default_list_set_error', 'Error setting default list'));
      }
    } catch (err) {
      setError(t('task_default_list_set_error', 'Error setting default list'));
      console.error('Error setting default task list:', err);
    } finally {
      setProcessingLists(false);
    }
  };

  // --- Task Item Handlers ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || !selectedListId) return;

    // Show that we're adding a task
    const tempId = `temp-add-${Date.now()}`;
    addUpdatingTaskId(tempId);

    // Clear input field immediately for better UX
    setNewTaskTitle('');

    try {
      // Make the API call to create the task and explicitly wait for it to complete
      await overlayApi.createTask({ listId: selectedListId, title });

      // Only after the create API completes, fetch the tasks
      // This ensures we get the latest data including our new task
      await fetchTasks(selectedListId, true);

      // If the create API returned a specific task object, we could use it here
      // But for robustness, we rely on the fetchTasks call to ensure consistency
    } catch (err) {
      setError(t('task_error_creating'));
      console.error('Error creating task:', err);
    } finally {
      // Remove the updating indicator
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
      setError(t('task_error_updating_status'));
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
      setError(t('task_error_deleting'));
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
      // Convert the types to match what the API expects
      const updatePayload: Partial<Task> = {
        title: trimmedTitle,
        notes: inlineEditValues.notes.trim() || undefined, // Using undefined instead of null
        due: formattedDueDate || undefined, // Using undefined instead of null
      };
      const updatedTask = await overlayApi.updateTask(
        originalTask.taskId || taskIdBeingSaved,
        updatePayload,
        selectedListId,
      );

      // 4. Update local state with the response from API
      if (updatedTask) {
        setTasks(currentTasks =>
          currentTasks.map(task =>
            task.id === taskIdBeingSaved || task.taskId === taskIdBeingSaved
              ? {
                  ...task,
                  // Apply updates from the API response, which will include title, notes, and due
                  ...updatedTask,
                }
              : task,
          ),
        );
      } else {
        // If the API doesn't return the updated task, fetch all tasks
        await fetchTasks(selectedListId, true);
      }
    } catch (err) {
      setError(t('task_error_saving_changes'));
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
      return t('task_invalid_date'); // Fallback for invalid date strings
    }
  };

  // --- Loading/Updating Indicator Logic (Unchanged) ---
  const isAnythingLoading = tasksLoading || taskListsLoading;
  const isUpdating = updatingTaskIds.size > 0;
  const showGlobalSpinner = isAnythingLoading || isUpdating;

  return (
    <div className="w-full max-w-7xl mx-auto relative z-10">
      {/* Header and Global Loading Indicator */}
      <div className="flex items-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">{t('task_title')}</h2>
        {showGlobalSpinner && (
          <div className="ml-3 flex items-center h-6 transition-all duration-300">
            <LoadingDots color="bg-primary" className="mt-0" />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">
          {error}{' '}
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-2">
            {t('task_dismiss')}
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-8 p-8 rounded-lg border border-border bg-card">
        {/* Task Lists Tabs with Add/Delete functionality */}
        {!taskListsLoading && taskLists.length > 0 && (
          <div className="mb-6">
            {/* Task list tabs - first row */}
            <div className="flex overflow-x-auto space-x-1 pb-2 border-b border-border">
              {taskLists.map(list => {
                const isDefault = userPreferences?.default_task_list === list.id;
                const isSelected = selectedListId === list.id;

                return (
                  <Button
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    variant={isSelected ? 'secondary' : 'ghost'}
                    className={`whitespace-nowrap px-3 py-1.5 md:px-4 md:py-2 rounded-none border-b-2 text-sm md:text-base flex items-center ${
                      isSelected
                        ? 'border-primary text-primary font-semibold'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    }`}>
                    {isDefault && <StarIcon className="h-4 w-4 mr-1.5 text-amber-500 fill-amber-500" />}
                    {list.title}
                  </Button>
                );
              })}

              {/* Add new list button */}
              <Button
                variant="ghost"
                className="whitespace-nowrap px-3 py-1.5 md:px-4 md:py-2 rounded-none border-b-2 border-transparent 
                  text-primary hover:bg-muted hover:text-primary hover:border-primary/50 text-sm md:text-base flex items-center"
                onClick={() => setIsNewListDialogOpen(true)}
                disabled={processingLists}>
                <PlusCircleIcon className="h-4 w-4 mr-1.5" />
                {t('task_new_list', 'New List')}
              </Button>
            </div>

            {/* List operations - second row */}
            {selectedListId && (
              <div className="flex items-center justify-end mt-2 space-x-2">
                {selectedListId && userPreferences?.default_task_list !== selectedListId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefaultList(selectedListId)}
                    disabled={processingLists}
                    className="h-8 text-xs">
                    <StarIcon className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                    {t('task_set_as_default', 'Set as default')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const list = taskLists.find(l => l.id === selectedListId);
                    if (list) confirmDeleteTaskList(list);
                  }}
                  disabled={processingLists}
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                  <TrashIcon className="h-3.5 w-3.5 mr-1.5" />
                  {t('task_delete_list', 'Delete list')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Loading/No Lists Message */}
        {taskListsLoading && (
          <div className="text-center py-8">
            <p className="text-sm mb-2 text-muted-foreground">Loading task lists</p>
            <LoadingDots color="bg-primary" />
          </div>
        )}

        {!taskListsLoading && taskLists.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-center mb-4 text-muted-foreground">{t('task_no_lists_found')}</p>
            <Button
              variant="default"
              size="lg"
              className="px-6 py-2 bg-primary hover:bg-primary/90"
              onClick={() => setIsNewListDialogOpen(true)}
              disabled={processingLists}>
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              {t('task_create_first_list', 'Create Your First Task List')}
            </Button>
          </div>
        )}

        {/* Task List Content */}
        {selectedListId && !taskListsLoading && (
          <div>
            {/* New Task Form */}
            <form onSubmit={handleCreateTask} className="mb-6 flex">
              <div className="flex-grow relative">
                <Input
                  type="text"
                  placeholder={t('task_add_new_placeholder')}
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateTask(e);
                    }
                  }}
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
                className="rounded-l-none rounded-r-md bg-primary hover:bg-primary/90 h-auto px-3 md:px-4" /* Adjusted padding */
                aria-label="Add task">
                <PlusIcon className="w-5 h-5" />
              </Button>
            </form>

            {/* Tasks List Area */}
            {tasksLoading ? (
              <div className="text-center py-8">
                <p className="font-medium mb-2 text-muted-foreground">{t('task_loading_tasks_short')}</p>
                <LoadingDots color="bg-primary" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-center py-8 font-medium text-muted-foreground">{t('task_no_tasks_found')}</p>
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
                        isBeingEdited ? 'bg-card border-border' : 'bg-card hover:bg-accent/30 border-border'
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
                            onKeyDown={e => {
                              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveInlineChanges();
                              }
                            }}
                          />
                          {/* Edit Notes */}
                          <Textarea
                            value={inlineEditValues.notes}
                            onChange={e => handleInlineInputChange('notes', e.target.value)}
                            placeholder="Add notes..."
                            className="text-sm w-full min-h-[60px] resize-y" // Match display size
                            disabled={isTaskUpdating}
                            aria-label="Edit task notes"
                            onKeyDown={e => {
                              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveInlineChanges();
                              }
                            }}
                          />
                          {/* Edit Due Date */}
                          <div className="flex items-center space-x-2">
                            <div className="flex-grow">
                              <Label htmlFor={`due-date-${editingTaskId}`} className="block mb-1 text-sm">
                                {t('task_due_date')}
                              </Label>
                              <Input
                                id={`due-date-${editingTaskId}`}
                                type="date"
                                className="w-full"
                                value={
                                  inlineEditValues.dueDate ? inlineEditValues.dueDate.toISOString().split('T')[0] : ''
                                }
                                onChange={e => {
                                  const dateStr = e.target.value;
                                  const date = dateStr ? new Date(dateStr) : undefined;
                                  handleInlineInputChange('dueDate', date);
                                }}
                                disabled={isTaskUpdating}
                              />
                            </div>
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
                              <ArrowUturnLeftIcon className="h-4 w-4 mr-1" /> {t('task_cancel')}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-primary-foreground"
                              onClick={handleSaveInlineChanges}
                              disabled={isTaskUpdating || !inlineEditValues.title.trim()} // Disable if updating or title empty
                              aria-label="Save changes">
                              {isTaskUpdating ? (
                                <LoadingDots size={4} color="bg-primary-foreground/80" className="mt-0 mx-auto" />
                              ) : (
                                <>
                                  <CheckIcon className="h-4 w-4 mr-1" /> {t('task_save')}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* === DISPLAY UI === */
                        <div
                          className="p-3 flex items-start gap-3"
                          onDoubleClick={() => !isCompleted && startEditingTask(task)}>
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
                                <LoadingDots size={4} color="bg-blue-500/80" className="mt-0 mx-auto" />
                              </div>
                            )}
                          </div>

                          {/* Task Content */}
                          <div className="flex-grow">
                            <label
                              id={`task-label-${task.id}`} // ID for aria-labelledby
                              htmlFor={`task-${task.id}`} // Associates label with checkbox
                              className={`text-md font-medium cursor-pointer ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                              {task.title}
                            </label>

                            {task.notes && (
                              <p
                                className={`mt-1 text-sm whitespace-pre-wrap ${isCompleted ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                                {task.notes}
                              </p>
                            )}

                            {task.due && (
                              <div
                                className={`flex items-center mt-1 text-xs ${
                                  !isCompleted && new Date(task.due) < new Date(new Date().setHours(0, 0, 0, 0)) // Overdue check
                                    ? 'text-destructive font-medium'
                                    : isCompleted
                                      ? 'text-muted-foreground/70'
                                      : 'text-primary'
                                }`}>
                                <CalendarIcon
                                  className={`w-3.5 h-3.5 mr-1 ${isCompleted ? 'text-muted-foreground/70' : 'text-primary'}`}
                                />
                                <span>
                                  {formatTaskDueDate(task.due)}
                                  {!isCompleted && new Date(task.due) < new Date(new Date().setHours(0, 0, 0, 0))
                                    ? ` ${t('task_overdue')}`
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
      </motion.div>

      {/* Create New List Dialog - Used by both empty state and add new list button */}
      <Dialog open={isNewListDialogOpen} onOpenChange={setIsNewListDialogOpen}>
        <DialogContent className="bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('task_create_new_list', 'Create New List')}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('task_create_new_list_description', 'Enter a name for your new task list.')}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              handleCreateTaskList();
            }}>
            <div className="py-4">
              <Label htmlFor="new-list-title" className="mb-2 block text-foreground">
                {t('task_list_name', 'List Name')}
              </Label>
              <Input
                ref={newListTitleInputRef}
                id="new-list-title"
                value={newListTitle}
                onChange={e => setNewListTitle(e.target.value)}
                placeholder={t('task_list_name_placeholder', 'My Tasks')}
                className="w-full bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-border hover:bg-muted text-foreground"
                onClick={() => {
                  setIsNewListDialogOpen(false);
                  setNewListTitle('');
                }}>
                {t('task_cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!newListTitle.trim() || processingLists}>
                {processingLists ? (
                  <LoadingDots size={4} color="bg-primary-foreground/80" className="mt-0 mx-auto" />
                ) : (
                  t('task_create', 'Create')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete List Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {t('task_delete_list_confirmation', 'Delete Task List')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t(
                'task_delete_list_description',
                'Are you sure you want to delete this task list? This will delete all tasks in this list and cannot be undone.',
              )}
              {taskListToDelete && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <strong className="font-medium text-foreground">{taskListToDelete.title}</strong>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              className="border-border hover:bg-muted text-foreground"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setTaskListToDelete(null);
              }}
              disabled={processingLists}>
              {t('task_cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => taskListToDelete && handleDeleteTaskList(taskListToDelete.id)}
              disabled={processingLists || !taskListToDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {processingLists ? (
                <LoadingDots size={4} color="bg-destructive-foreground/80" className="mt-0 mx-auto" />
              ) : (
                t('task_delete', 'Delete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
