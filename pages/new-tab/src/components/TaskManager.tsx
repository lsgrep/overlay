import { useState, useEffect, useCallback } from 'react';
import { tasksStorage } from '@extension/storage';
import { overlayApi, type TaskList, type Task } from '@extension/shared/lib/services/api';
import { PlusIcon, TrashIcon, PencilIcon, CalendarIcon, XMarkIcon as X } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Textarea,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Calendar,
  Label,
} from '@extension/ui';

import type { UserPreferences } from '@extension/storage/lib/impl/userPreferencesStorage';

interface TaskManagerProps {
  isLight: boolean;
  userPreferences: UserPreferences | null;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ isLight, userPreferences }) => {
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Task editing states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState<string>('');
  const [editTaskNotes, setEditTaskNotes] = useState<string>('');
  const [editTaskDueDate, setEditTaskDueDate] = useState<Date | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);

  // Define fetchTasks with useCallback to prevent infinite loops
  const fetchTasks = useCallback(
    async (listId: string) => {
      try {
        setLoading(true);

        // Try to get tasks from cache first
        const cachedTasks = await tasksStorage.get();
        const listTasks = cachedTasks[listId];

        if (listTasks && listTasks.length > 0) {
          // Use cached tasks if available
          console.log('Using cached tasks for list:', listId);
          setTasks(listTasks);
          setError(null);
          setLoading(false);

          // Fetch fresh data in the background
          overlayApi
            .getTasks(listId)
            .then(tasksData => {
              // Update cache and state if there are differences
              if (JSON.stringify(tasksData) !== JSON.stringify(listTasks)) {
                setTasks(tasksData);
                // Update cache
                tasksStorage.set(prevCache => ({
                  ...prevCache,
                  [listId]: tasksData,
                }));
              }
            })
            .catch(e => console.error('Background task refresh error:', e));
        } else {
          // Fetch from API if no cache
          const tasksData = await overlayApi.getTasks(listId);
          setTasks(tasksData);
          // Update cache
          tasksStorage.set(prevCache => ({
            ...prevCache,
            [listId]: tasksData,
          }));
          setError(null);
        }
      } catch (err) {
        setError('Failed to load tasks. Please try again.');
        console.error('Error fetching tasks:', err);
      } finally {
        setLoading(false);
      }
    },
    [], // No dependency needed as listId is passed as an argument
  );

  // Define fetchTaskLists with useCallback to prevent infinite loops
  const fetchTaskLists = useCallback(async () => {
    try {
      setLoading(true);
      const lists = await overlayApi.getTaskLists();
      setTaskLists(lists);

      // Use preferences from props rather than fetching again
      if (userPreferences && userPreferences.default_task_list) {
        // Check if the default list exists in the fetched lists
        const defaultListExists = lists.some(list => list.id === userPreferences.default_task_list);

        if (defaultListExists && !selectedListId) {
          setSelectedListId(userPreferences.default_task_list);
        } else if (lists.length > 0 && !selectedListId) {
          // Fallback to first list if default list not found
          setSelectedListId(lists[0].id);
        }
      } else if (lists.length > 0 && !selectedListId) {
        // Fallback to first list if no preferences
        setSelectedListId(lists[0].id);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load task lists. Please try again.');
      console.error('Error fetching task lists:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedListId, userPreferences]);

  // Use default task list from user preferences
  useEffect(() => {
    if (userPreferences && userPreferences.default_task_list && !selectedListId) {
      setSelectedListId(userPreferences.default_task_list);
    }
  }, [userPreferences, selectedListId]);

  // Fetch task lists on component mount
  useEffect(() => {
    fetchTaskLists();
  }, [fetchTaskLists]);

  // Fetch tasks when selected list changes
  useEffect(() => {
    if (selectedListId) {
      fetchTasks(selectedListId);
    }
  }, [selectedListId, fetchTasks]);

  // Add selection of first task list if none selected but lists are available
  useEffect(() => {
    if (taskLists.length > 0 && !selectedListId) {
      setSelectedListId(taskLists[0].id);
    }
  }, [taskLists, selectedListId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedListId) return;

    // Temporarily show loading state
    setLoading(true);
    try {
      console.log('Creating task with listId:', selectedListId, 'title:', newTaskTitle.trim());
      // Create new task with the API
      const newTask = await overlayApi.createTask({
        listId: selectedListId,
        title: newTaskTitle.trim(),
      });
      console.log('Task created successfully:', newTask);

      // Refresh tasks
      fetchTasks(selectedListId);
      setNewTaskTitle('');
    } catch (err) {
      setError('Failed to create task. Please try again.');
      console.error('Error creating task:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, completed: boolean) => {
    if (!selectedListId) return;

    try {
      // Set the currently updating taskId to show the spinner
      setUpdatingTaskId(taskId);

      // Find the complete task object to get the actual taskId
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) {
        console.error('Task not found in local state:', taskId);
        setError('Failed to update task: Task not found');
        setUpdatingTaskId(null);
        return;
      }

      // Log the full task object for debugging
      console.log('Task to update:', taskToUpdate);

      // Optimistic UI update - update the local state immediately
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: completed ? 'completed' : 'needsAction' } : task,
        ),
      );

      console.log('Updating task status:', {
        id: taskId,
        taskId: taskToUpdate.taskId, // Use the correct taskId from the task object
        listId: selectedListId,
        status: completed ? 'completed' : 'needsAction',
      });

      // Then perform the API call - include all required fields in the payload
      const result = await overlayApi.updateTask(
        taskId,
        {
          id: taskId,
          taskId: taskToUpdate.taskId, // Use the correct taskId from the task object
          status: completed ? 'completed' : 'needsAction',
          listId: selectedListId, // Include listId explicitly in the payload
        },
        selectedListId,
      );
      console.log('Task update result:', result);

      // Don't refresh tasks after successful update since we already updated optimistically
      // This prevents UI flickering and unnecessary API calls
    } catch (err) {
      setError('Failed to update task. Please try again.');
      console.error('Error updating task:', err);
      // Revert optimistic update on error
      fetchTasks(selectedListId);
    } finally {
      // Clear the updating taskId when operation completes
      setUpdatingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedListId) return;

    try {
      // Find the complete task object to get the actual taskId
      const taskToDelete = tasks.find(task => task.id === taskId);
      if (!taskToDelete) {
        console.error('Task not found in local state:', taskId);
        setError('Failed to delete task: Task not found');
        return;
      }

      // Make sure we have a valid taskId, fallback to the local id if taskId is undefined
      const actualTaskId = taskToDelete.taskId || taskToDelete.id;
      console.log('Task to delete:', taskToDelete, 'Using taskId:', actualTaskId);

      // Optimistic UI update - remove task from local state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));

      // Using query parameters for task deletion as per updated API
      // Pass the taskId from the task object, with fallback to local ID
      await overlayApi.deleteTask(actualTaskId, selectedListId);

      // Refresh tasks to ensure consistency
      fetchTasks(selectedListId);
    } catch (err) {
      setError('Failed to delete task. Please try again.');
      console.error('Error deleting task:', err);
      // Revert optimistic update on error
      fetchTasks(selectedListId);
    }
  };

  const formatTaskDueDate = (dueDate?: string) => {
    if (!dueDate) return null;

    return overlayApi.formatDate(dueDate);
  };

  // Handler to open the edit dialog
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskNotes(task.notes || '');
    setEditTaskDueDate(task.due ? new Date(task.due) : undefined);
    setIsEditDialogOpen(true);
  };

  // Handler to save task changes
  const handleSaveTaskChanges = async () => {
    if (!editingTask || !selectedListId) return;

    try {
      setUpdatingTaskId(editingTask.id);

      // Format due date if provided
      const dueDate = editTaskDueDate ? editTaskDueDate.toISOString() : undefined;

      // Prepare update payload
      const updatePayload = {
        id: editingTask.id,
        taskId: editingTask.taskId,
        title: editTaskTitle,
        notes: editTaskNotes,
        due: dueDate,
        listId: selectedListId,
      };

      console.log('Updating task with changes:', updatePayload);

      // Optimistic UI update
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === editingTask.id ? { ...task, title: editTaskTitle, notes: editTaskNotes, due: dueDate } : task,
        ),
      );

      // Call API to update task
      await overlayApi.updateTask(editingTask.id, updatePayload, selectedListId);

      // Close the dialog
      setIsEditDialogOpen(false);
      setEditingTask(null);

      // Refresh tasks to ensure data consistency
      fetchTasks(selectedListId);
    } catch (err) {
      setError('Failed to update task. Please try again.');
      console.error('Error updating task details:', err);
      // Revert optimistic update on error
      fetchTasks(selectedListId);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto relative z-10">
      <div className="flex items-center mb-6">
        <h2 className="text-xl font-semibold">Your Tasks</h2>
        {loading && <ArrowPathIcon className="ml-2 w-4 h-4 animate-spin text-blue-400" />}
      </div>

      {error && (
        <div
          className={`mb-4 p-3 rounded-lg border ${isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-900/10 border-red-800/30 text-red-400'}`}>
          {error}
        </div>
      )}

      {taskLists.length === 0 ? (
        <div
          className={`space-y-8 p-8 rounded-lg border ${isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'}`}>
          <p className={`text-sm text-center ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            {loading ? 'Loading task lists...' : 'No task lists found.'}
          </p>
        </div>
      ) : (
        <div
          className={`space-y-8 p-8 rounded-lg border ${isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'}`}>
          {/* Custom Tab UI */}
          <div className="mb-6">
            <div className="flex overflow-x-auto space-x-1 pb-2">
              {taskLists.map(list => (
                <Button
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  variant={selectedListId === list.id ? 'default' : 'outline'}
                  className={`whitespace-nowrap px-4 py-2 ${
                    selectedListId === list.id
                      ? 'bg-blue-500 text-white'
                      : `${isLight ? 'hover:bg-gray-100 text-gray-900' : 'hover:bg-gray-900 text-gray-100'}`
                  }`}>
                  {list.title}
                </Button>
              ))}
            </div>
          </div>

          {/* Content for selected tab */}
          <div>
            {selectedListId && (
              <div className="mb-4">
                <h3 className={`text-lg font-medium ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                  {taskLists.find(list => list.id === selectedListId)?.title}
                </h3>
              </div>
            )}
            {/* New Task Form */}
            {selectedListId && (
              <form onSubmit={handleCreateTask} className="mb-4 flex">
                <div className="flex-grow rounded-l-lg border-r-0 border border-input focus-within:ring-2 focus-within:ring-ring transition-all bg-background/80">
                  <input
                    type="text"
                    placeholder="Add a new task..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="w-full p-2 bg-transparent border-none outline-none text-foreground"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  variant="default"
                  size="icon"
                  className="rounded-l-none rounded-r-lg bg-blue-500 hover:bg-blue-600">
                  {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PlusIcon className="w-5 h-5" />}
                </Button>
              </form>
            )}

            {/* Tasks List */}
            {!selectedListId ? (
              <p className={`text-center py-8 font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                Select a task list to view tasks
              </p>
            ) : tasks.length === 0 ? (
              <p className={`text-center py-8 font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                {loading ? 'Loading tasks...' : 'No tasks found in this list.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {tasks.map(task => (
                  <li
                    key={task.id}
                    className={`rounded-lg p-3 transition-all duration-200 mb-3 ${
                      isLight
                        ? 'bg-white hover:bg-gray-50 border border-gray-200'
                        : 'bg-gray-900/40 hover:bg-gray-900/50 border border-gray-800/30'
                    } ${task.status === 'completed' ? 'border-l-4 border-blue-400' : ''}`}>
                    <div className="flex items-start gap-3">
                      {updatingTaskId === task.id ? (
                        <div className="mt-1 flex-shrink-0 w-4 h-4">
                          <ArrowPathIcon className="animate-spin text-blue-600 dark:text-blue-400" />
                        </div>
                      ) : (
                        <Checkbox
                          id={`task-${task.id}`}
                          checked={task.status === 'completed'}
                          onCheckedChange={checked => handleUpdateTaskStatus(task.id, checked === true)}
                          className="mt-1"
                        />
                      )}

                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <div className="flex-grow">
                            <label
                              htmlFor={`task-${task.id}`}
                              className={`text-md font-medium cursor-pointer ${task.status === 'completed' ? (isLight ? 'text-gray-400 line-through' : 'text-gray-500 line-through') : isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                              {task.title}
                            </label>

                            {task.notes && (
                              <p
                                className={`mt-1 text-sm ${task.status === 'completed' ? (isLight ? 'text-gray-400' : 'text-gray-500') : isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                {task.notes}
                              </p>
                            )}

                            {task.due && (
                              <div className="flex items-center mt-1">
                                <CalendarIcon className="w-4 h-4 mr-1 text-blue-500" />
                                <span
                                  className={`text-xs ${new Date(task.due) < new Date() && task.status !== 'completed' ? 'text-red-500' : isLight ? 'text-blue-500' : 'text-blue-400'}`}>
                                  {formatTaskDueDate(task.due)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className={`h-7 w-7 text-xs ${isLight ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-800/50'}`}
                              onClick={() => handleEditTask(task)}>
                              <PencilIcon className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className={`h-7 w-7 text-xs ${isLight ? 'text-red-500 hover:bg-gray-100' : 'text-red-400 hover:bg-gray-800/50'}`}
                              onClick={() => handleDeleteTask(task.id)}>
                              <TrashIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Task Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          className={`sm:max-w-md ${isLight ? 'bg-white border border-black/10' : 'bg-black border border-white/10'}`}>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="taskTitle">Title</Label>
              <input
                type="text"
                id="taskTitle"
                value={editTaskTitle}
                onChange={e => setEditTaskTitle(e.target.value)}
                className="w-full p-2 rounded-md border border-input bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Task title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="taskNotes">Notes</Label>
              <Textarea
                id="taskNotes"
                value={editTaskNotes}
                onChange={e => setEditTaskNotes(e.target.value)}
                placeholder="Add notes or details..."
                className="min-h-[100px] resize-none"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="taskDueDate">Due Date</Label>
              <div className="flex items-center space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="taskDueDate" variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editTaskDueDate ? formatTaskDueDate(editTaskDueDate.toISOString()) : 'Select a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={editTaskDueDate} onSelect={setEditTaskDueDate} initialFocus />
                  </PopoverContent>
                </Popover>
                {editTaskDueDate && (
                  <Button variant="ghost" size="icon" onClick={() => setEditTaskDueDate(undefined)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTaskChanges}
              disabled={!editTaskTitle.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white">
              {updatingTaskId === editingTask?.id ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" /> Saving
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
