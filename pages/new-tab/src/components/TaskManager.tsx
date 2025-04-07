import { useState, useEffect, useCallback } from 'react';
import { overlayApi, type TaskList, type Task } from '@extension/shared/lib/services/api';
import {
  PlusIcon,
  TrashIcon,
  ChevronRightIcon,
  ClockIcon,
  PencilIcon,
  CalendarIcon,
  XMarkIcon as X,
} from '@heroicons/react/24/outline';
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
  Textarea,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Calendar,
  Label,
} from '@extension/ui';

interface TaskManagerProps {
  isLight: boolean;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ isLight }) => {
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
  const fetchTasks = useCallback(async (listId: string) => {
    try {
      setLoading(true);
      const tasksData = await overlayApi.getTasks(listId);
      setTasks(tasksData);
      setError(null);
    } catch (err) {
      setError('Failed to load tasks. Please try again.');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Define fetchTaskLists with useCallback to prevent infinite loops
  const fetchTaskLists = useCallback(async () => {
    try {
      setLoading(true);
      const lists = await overlayApi.getTaskLists();
      setTaskLists(lists);

      // Select the first list by default if available
      if (lists.length > 0 && !selectedListId) {
        setSelectedListId(lists[0].id);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load task lists. Please try again.');
      console.error('Error fetching task lists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      <div className="flex items-center justify-center mb-6">
        <img src="/icon-128.png" alt="Overlay" className="w-8 h-8 mr-3" />
        <h2 className="text-2xl font-semibold">Your Tasks</h2>
      </div>

      {error && (
        <div
          className={`mb-4 p-3 rounded-lg ${isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-900/20 text-indigo-400'}`}>
          {error}
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${loading ? 'opacity-70' : ''}`}>
        {/* Task Lists Panel (Left) */}
        <Card className="md:col-span-1 backdrop-blur-sm bg-card/80 border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className={`${isLight ? 'text-gray-800' : 'text-gray-100'}`}>Task Lists</CardTitle>
          </CardHeader>
          <CardContent>
            {taskLists.length === 0 ? (
              <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                {loading ? 'Loading task lists...' : 'No task lists found.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {taskLists.map(list => (
                  <li key={list.id}>
                    <button
                      onClick={() => setSelectedListId(list.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex justify-between items-center ${
                        selectedListId === list.id
                          ? 'bg-gray-800 text-white shadow-sm dark:bg-gray-100 dark:text-gray-900'
                          : isLight
                            ? 'hover:bg-gray-100 text-gray-900 hover:shadow-sm'
                            : 'hover:bg-gray-800 text-gray-100 hover:shadow-sm'
                      }`}>
                      <span className="font-medium">{list.title}</span>
                      {selectedListId === list.id && <ChevronRightIcon className="w-5 h-5" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Tasks Panel (Right) */}
        <Card className="md:col-span-2 backdrop-blur-sm bg-card/80 border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className={`${isLight ? 'text-gray-800' : 'text-gray-100'}`}>
              {(selectedListId && taskLists.find(list => list.id === selectedListId)?.title) || 'Tasks'}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  className="rounded-l-none rounded-r-lg">
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
                        ? 'bg-card/60 hover:bg-card/90 shadow-sm hover:shadow-md'
                        : 'bg-card/40 hover:bg-card/70 shadow-sm hover:shadow-md'
                    } ${task.status === 'completed' ? 'border-l-4 border-gray-400' : ''}`}>
                    <div className="flex items-start gap-3">
                      {updatingTaskId === task.id ? (
                        <div className="mt-1 flex-shrink-0 w-4 h-4">
                          <ArrowPathIcon className="w-4 h-4 text-gray-500 animate-spin" />
                        </div>
                      ) : (
                        <Checkbox
                          checked={task.status === 'completed'}
                          onCheckedChange={checked => {
                            console.log('Checkbox changed:', checked);
                            handleUpdateTaskStatus(task.id, checked === true);
                          }}
                          className={`mt-1 flex-shrink-0 ${task.status === 'completed' ? 'data-[state=checked]:bg-gray-600 data-[state=checked]:border-gray-600' : ''}`}
                        />
                      )}

                      <div className="flex-grow">
                        <div
                          className={`font-medium transition-all duration-200 ${task.status === 'completed' ? (isLight ? 'text-indigo-400 line-through' : 'text-indigo-500 line-through') : isLight ? 'text-indigo-700' : 'text-indigo-200'}`}>
                          {task.title}
                        </div>

                        {task.notes && (
                          <div
                            className={`mt-2 text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} p-2 rounded-md ${isLight ? 'bg-gray-50' : 'bg-gray-800/30'}`}>
                            {task.notes}
                          </div>
                        )}

                        {task.due && (
                          <div
                            className={`text-xs mt-2 flex items-center px-2 py-1 rounded-full w-fit ${isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-800 text-gray-300'}`}>
                            <ClockIcon className="w-3 h-3 mr-1" />
                            {formatTaskDueDate(task.due)}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-1">
                        <Button
                          onClick={() => handleEditTask(task)}
                          variant="ghost"
                          size="icon"
                          className={`flex-shrink-0 h-7 w-7 ${isLight ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'}`}>
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteTask(task.id)}
                          variant="ghost"
                          size="icon"
                          className={`flex-shrink-0 h-7 w-7 ${isLight ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'}`}>
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px] backdrop-blur-sm bg-white border-gray-200 dark:bg-gray-900/90 dark:border-gray-800 shadow-lg">
          <DialogHeader className="pb-2 border-b border-gray-100 dark:border-gray-800/30">
            <div className="flex items-center">
              <img src="/icon-128.png" alt="Overlay" className="w-5 h-5 mr-2" />
              <DialogTitle className="text-gray-800 dark:text-gray-200 font-medium">Edit Task</DialogTitle>
            </div>
          </DialogHeader>
          <div className="grid gap-5 py-5">
            <div className="grid gap-2">
              <Label htmlFor="taskTitle" className="text-gray-700 dark:text-gray-300 font-medium">
                Title
              </Label>
              <input
                id="taskTitle"
                value={editTaskTitle}
                onChange={e => setEditTaskTitle(e.target.value)}
                className="w-full p-3 border border-gray-200 dark:border-gray-700/50 rounded-md bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-gray-600 transition-all shadow-sm"
                placeholder="Task title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="taskNotes" className="text-gray-700 dark:text-gray-300 font-medium">
                Notes
              </Label>
              <Textarea
                id="taskNotes"
                value={editTaskNotes}
                onChange={e => setEditTaskNotes(e.target.value)}
                placeholder="Add notes or details..."
                className="min-h-[100px] p-3 border border-gray-200 dark:border-gray-700/50 rounded-md bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-gray-600 transition-all shadow-sm resize-none"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="taskDueDate" className="text-gray-700 dark:text-gray-300 font-medium">
                Due Date
              </Label>
              <div className="flex items-center space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="taskDueDate"
                      variant="outline"
                      className={`w-full justify-start text-left p-3 border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-normal ${
                        !editTaskDueDate && 'text-gray-400 dark:text-gray-500'
                      }`}>
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                      {editTaskDueDate ? formatTaskDueDate(editTaskDueDate.toISOString()) : 'Select a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md"
                    align="start">
                    <Calendar
                      mode="single"
                      selected={editTaskDueDate}
                      onSelect={setEditTaskDueDate}
                      initialFocus
                      className="rounded-md border-0 text-gray-900 dark:text-gray-100"
                    />
                  </PopoverContent>
                </Popover>
                {editTaskDueDate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditTaskDueDate(undefined)}
                    className="h-10 w-10 rounded-full bg-white dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-gray-100 dark:border-gray-800/30 pt-3">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-800 dark:hover:text-gray-200">
              Cancel
            </Button>
            <Button
              onClick={handleSaveTaskChanges}
              disabled={!editTaskTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-white shadow-sm disabled:opacity-50 disabled:pointer-events-none">
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
