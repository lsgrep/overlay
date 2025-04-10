import { useState, useEffect, useCallback } from 'react';
import { overlayApi, type TaskList, type Task } from '@extension/shared/lib/services/api';
import { PlusIcon, TrashIcon, PencilIcon, CalendarIcon, XMarkIcon as X } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import {
  Button,
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
  Input, // Assuming Input is available from @extension/ui, if not use standard <input>
} from '@extension/ui'; // Assuming Input is from here or use standard html input

import type { UserPreferences } from '@extension/storage/lib/impl/userPreferencesStorage';

interface TaskManagerProps {
  isLight: boolean;
  userPreferences: UserPreferences | null;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ isLight, userPreferences }) => {
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(true);
  const [taskListsLoading, setTaskListsLoading] = useState<boolean>(true);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // Keep track of tasks undergoing *any* async operation (create, update, delete)
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());

  // Task editing states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState<string>('');
  const [editTaskNotes, setEditTaskNotes] = useState<string>('');
  const [editTaskDueDate, setEditTaskDueDate] = useState<Date | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);

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

  // Fetch tasks for a specific list. Always fetches fresh data.
  const fetchTasks = useCallback(
    async (listId: string, skipLoadingIndicator = false) => {
      if (!listId) return; // Don't fetch if no list is selected

      // Only show full "Loading tasks..." if not a background refresh
      if (!skipLoadingIndicator) {
        setTasksLoading(true);
      }
      setError(null); // Clear previous errors

      try {
        const tasksData = await overlayApi.getTasks(listId);
        setTasks(tasksData); // Directly set the fetched tasks
      } catch (err) {
        setError('Failed to load tasks. Please try again.');
        console.error(`Error fetching tasks for list ${listId}:`, err);
        setTasks([]); // Clear tasks on error
      } finally {
        if (!skipLoadingIndicator) {
          setTasksLoading(false);
        }
      }
    },
    [], // No dependencies needed as it only uses its argument listId
  );

  // Fetch all task lists
  const fetchTaskLists = useCallback(async () => {
    setTaskListsLoading(true);
    setError(null);
    try {
      const lists = await overlayApi.getTaskLists();
      setTaskLists(lists);

      // Determine the list to select *after* lists are fetched
      let listToSelect = selectedListId; // Keep current selection if valid

      if (!listToSelect && lists.length > 0) {
        // If no list is selected, try using the default preference
        const defaultListId = userPreferences?.default_task_list;
        if (defaultListId && lists.some(list => list.id === defaultListId)) {
          listToSelect = defaultListId;
        } else {
          // Otherwise, fall back to the first list
          listToSelect = lists[0].id;
        }
      } else if (selectedListId && !lists.some(list => list.id === selectedListId)) {
        // If the currently selected list no longer exists, select the first list if available
        listToSelect = lists.length > 0 ? lists[0].id : '';
      }

      // Update selectedListId state *once* after determining the correct ID
      // This also triggers the useEffect below to fetch tasks for the newly selected list
      if (listToSelect !== selectedListId) {
        setSelectedListId(listToSelect);
      } else if (!listToSelect && lists.length === 0) {
        // Handle the case where there are no lists at all
        setSelectedListId('');
        setTasks([]); // Clear tasks if no list is selected
      }
    } catch (err) {
      setError('Failed to load task lists. Please try again.');
      console.error('Error fetching task lists:', err);
      setTaskLists([]); // Clear lists on error
      setSelectedListId('');
      setTasks([]);
    } finally {
      setTaskListsLoading(false);
    }
  }, [userPreferences, selectedListId]); // Keep selectedListId dependency for re-validation

  // --- Effects ---

  // Fetch task lists on component mount
  useEffect(() => {
    fetchTaskLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTaskLists]); // fetchTaskLists is stable due to useCallback

  // Fetch tasks when the selected list changes
  useEffect(() => {
    // Reset tasks and loading state when list changes before fetching
    setTasks([]);
    if (selectedListId) {
      fetchTasks(selectedListId, false); // Show loading indicator on list change
    } else {
      setTasksLoading(false); // No list selected, stop loading
    }
  }, [selectedListId, fetchTasks]); // fetchTasks is stable

  // --- Event Handlers ---

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || !selectedListId) return;

    // Create a temporary optimistic task ID (used for loading state only)
    const tempId = `temp-${Date.now()}`;
    addUpdatingTaskId(tempId); // Use tempId for the spinner during creation
    setNewTaskTitle(''); // Clear input immediately

    try {
      const taskData = { listId: selectedListId, title: title };
      await overlayApi.createTask(taskData);
      // Successfully created, fetch the updated list to get the real task
      await fetchTasks(selectedListId, true); // Refresh list (skip loading indicator)
    } catch (err) {
      setError('Failed to create task. Please try again.');
      console.error('Error creating task:', err);
      // No need to manually remove optimistic task, fetchTasks will reset state on next load
      // Or optionally trigger a fetch here to ensure consistency if needed:
      // await fetchTasks(selectedListId, true);
    } finally {
      removeUpdatingTaskId(tempId); // Remove the temporary ID
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, completed: boolean) => {
    if (!selectedListId) return;

    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;

    // Store the original status for potential rollback
    const originalStatus = taskToUpdate.status;
    const newStatus = completed ? 'completed' : 'needsAction';

    // 1. Add to updating set
    addUpdatingTaskId(taskId);

    // 2. Optimistic UI Update
    setTasks(currentTasks => currentTasks.map(task => (task.id === taskId ? { ...task, status: newStatus } : task)));

    try {
      // 3. API Call
      const updatePayload = { status: newStatus }; // Only send changed fields
      await overlayApi.updateTask(taskToUpdate.taskId || taskId, updatePayload, selectedListId); // Use taskId if actual API task ID exists

      // 4. Success: Fetch to confirm state (optional but recommended for consistency)
      // If you skip fetching, the optimistic state remains until the next list load.
      // await fetchTasks(selectedListId, true); // Refresh list silently
    } catch (err) {
      setError('Failed to update task status. Please try again.');
      console.error('Error updating task status:', err);

      // 5. Failure: Revert Optimistic Update
      setTasks(currentTasks =>
        currentTasks.map(task => (task.id === taskId ? { ...task, status: originalStatus } : task)),
      );
      // Optionally fetch to ensure consistency with the server after failure
      // await fetchTasks(selectedListId, true);
    } finally {
      // 6. Remove from updating set
      removeUpdatingTaskId(taskId);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedListId) return;

    const taskToDelete = tasks.find(task => task.id === taskId);
    if (!taskToDelete) return;

    // Store the task for potential rollback
    const originalTasks = [...tasks];

    // 1. Add to updating set
    addUpdatingTaskId(taskId);

    // 2. Optimistic UI Update
    setTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));

    try {
      // 3. API Call
      await overlayApi.deleteTask(taskToDelete.taskId || taskId, selectedListId);

      // 4. Success: Fetch to confirm state (optional, as filter already removed it)
      // Fetching ensures any other server-side changes are reflected.
      // await fetchTasks(selectedListId, true);
    } catch (err) {
      setError('Failed to delete task. Please try again.');
      console.error('Error deleting task:', err);

      // 5. Failure: Revert Optimistic Update
      setTasks(originalTasks);
      // Optionally fetch to ensure consistency with the server after failure
      // await fetchTasks(selectedListId, true);
    } finally {
      // 6. Remove from updating set
      removeUpdatingTaskId(taskId);
    }
  };

  // --- Edit Task Handlers ---
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskNotes(task.notes || '');
    setEditTaskDueDate(task.due ? new Date(task.due) : undefined);
    setIsEditDialogOpen(true);
  };

  const handleSaveTaskChanges = async () => {
    if (!editingTask || !selectedListId) return;

    // Store original task for potential rollback
    const originalTask = tasks.find(task => task.id === editingTask.id);
    if (!originalTask) return; // Should not happen if editingTask is set

    const dueDate = editTaskDueDate ? editTaskDueDate.toISOString().split('T')[0] : undefined; // Format as YYYY-MM-DD for API if needed

    // 1. Add to updating set
    addUpdatingTaskId(editingTask.id);

    // 2. Optimistic UI Update
    const updatedTaskData = {
      ...editingTask,
      title: editTaskTitle.trim(),
      notes: editTaskNotes.trim(),
      due: dueDate,
    };
    setTasks(currentTasks => currentTasks.map(task => (task.id === editingTask.id ? updatedTaskData : task)));

    // Close dialog immediately
    setIsEditDialogOpen(false);
    // Don't reset editingTask here yet, needed for finally block

    try {
      // 3. API Call - only send changed fields
      const updatePayload = {
        title: updatedTaskData.title,
        notes: updatedTaskData.notes || null, // Send null if empty to clear
        due: updatedTaskData.due || null, // Send null if no date
      };
      await overlayApi.updateTask(editingTask.taskId || editingTask.id, updatePayload, selectedListId);

      // 4. Success: Fetch to confirm state (recommended)
      await fetchTasks(selectedListId, true);
    } catch (err) {
      setError('Failed to save task changes. Please try again.');
      console.error('Error saving task changes:', err);

      // 5. Failure: Revert Optimistic Update
      setTasks(currentTasks => currentTasks.map(task => (task.id === editingTask.id ? originalTask : task)));
      // Optionally fetch to ensure consistency
      // await fetchTasks(selectedListId, true);
    } finally {
      // 6. Remove from updating set and clear editing state
      removeUpdatingTaskId(editingTask.id);
      setEditingTask(null); // Clear editing state *after* potential revert
    }
  };

  const formatTaskDueDate = (dueDate?: string | Date) => {
    if (!dueDate) return null;
    const dateString = typeof dueDate === 'string' ? dueDate : dueDate.toISOString();
    // Assuming overlayApi.formatDate handles ISO strings or Date objects appropriately
    // Make sure formatDate handles potential timezones correctly if needed.
    return overlayApi.formatDate(dateString);
  };

  // --- Loading/Updating Indicator Logic ---
  const isAnythingLoading = tasksLoading || taskListsLoading;
  const isUpdating = updatingTaskIds.size > 0;
  const showGlobalSpinner = isAnythingLoading || isUpdating;

  const getGlobalLoadingText = () => {
    if (taskListsLoading) return 'Loading task lists...';
    if (tasksLoading) return 'Loading tasks...'; // Shown when list changes or initial load
    if (isUpdating) return `Processing update${updatingTaskIds.size > 1 ? 's' : ''}...`; // More generic for CUD operations
    return ''; // Should not be reached if showGlobalSpinner is true
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
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`space-y-8 p-8 rounded-lg border ${isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'}`}>
        {/* Task Lists Tabs (Only show if lists are loaded) */}
        {!taskListsLoading && taskLists.length > 0 && (
          <div className="mb-6">
            <div className="flex overflow-x-auto space-x-1 pb-2 border-b border-border">
              {' '}
              {/* Added border */}
              {taskLists.map(list => (
                <Button
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  // Use a more distinct active style
                  variant={selectedListId === list.id ? 'secondary' : 'ghost'}
                  className={`whitespace-nowrap px-4 py-2 rounded-none border-b-2 ${
                    selectedListId === list.id
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' // Active tab style
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground' // Inactive tab style
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

        {/* Task List Content (Tasks, Form) - Only show if a list is selected */}
        {selectedListId && !taskListsLoading && (
          <div>
            {/* List Title (Optional - might be redundant with tab) */}
            {/* <h3 className={`text-lg font-medium mb-4 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                {taskLists.find(list => list.id === selectedListId)?.title}
              </h3> */}

            {/* New Task Form */}
            <form onSubmit={handleCreateTask} className="mb-6 flex">
              <div className="flex-grow relative">
                {/* Use Input component for better styling consistency */}
                <Input
                  type="text"
                  placeholder="Add a new task and press Enter..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full p-2 rounded-r-none border-r-0" // Adjusted classes if needed
                  disabled={isUpdating} // Disable while any update is happening
                />
              </div>
              <Button
                type="submit"
                disabled={!newTaskTitle.trim() || isUpdating} // Disable if empty or updating
                variant="default"
                size="icon"
                className="rounded-l-none rounded-r-md bg-indigo-500 hover:bg-indigo-600 h-auto px-4">
                {' '}
                {/* Adjust padding/height */}
                {/* Show spinner specifically if a *create* operation is ongoing (though global spinner might cover) */}
                {/* For simplicity, using the global isUpdating flag */}
                {isUpdating && updatingTaskIds.has(`temp-${Date.now()}`) ? ( // Check if a create is happening (less reliable)
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <PlusIcon className="w-5 h-5" />
                )}
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
              <ul className="space-y-3">
                {' '}
                {/* Increased spacing */}
                {tasks.map(task => {
                  const isTaskUpdating = updatingTaskIds.has(task.id) || updatingTaskIds.has(task.taskId || '');
                  const isCompleted = task.status === 'completed';
                  const isOverdue =
                    task.due && !isCompleted && new Date(task.due) < new Date(new Date().setHours(0, 0, 0, 0)); // Check if due date is in the past

                  return (
                    <li
                      key={task.id} // Use the stable ID from the API if possible, fallback to generated one
                      className={`rounded-lg p-3 transition-all duration-200 flex items-start gap-3 ${
                        isLight
                          ? 'bg-white hover:bg-gray-50 border border-gray-200'
                          : 'bg-gray-900/40 hover:bg-gray-900/50 border border-gray-800/30'
                      } ${isCompleted ? 'opacity-60' : ''} ${isTaskUpdating ? 'opacity-70 bg-muted/30' : ''}`}>
                      {' '}
                      {/* Style updating/completed tasks */}
                      {/* Checkbox and Spinner */}
                      <div className="mt-1 flex-shrink-0 w-4 h-4 relative">
                        <Checkbox
                          id={`task-${task.id}`}
                          checked={isCompleted}
                          onCheckedChange={checked => handleUpdateTaskStatus(task.id, Boolean(checked))}
                          disabled={isTaskUpdating}
                          className={`${isTaskUpdating ? 'opacity-0' : 'opacity-100'} transition-opacity`}
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
                          htmlFor={`task-${task.id}`}
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
                              isOverdue
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
                              className={`w-3.5 h-3.5 mr-1 ${isOverdue ? '' : isCompleted ? 'text-gray-400 dark:text-gray-600' : 'text-indigo-500'}`}
                            />
                            <span>
                              {formatTaskDueDate(task.due)} {isOverdue ? '(Overdue)' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Action Buttons */}
                      <div className="flex gap-1 ml-2 flex-shrink-0">
                        <Button
                          variant="ghost" // Use ghost for less visual noise
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditTask(task)}
                          disabled={isTaskUpdating}
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
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Task Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={`sm:max-w-md ${isLight ? 'bg-white' : 'bg-background'}`}>
          {' '}
          {/* Use theme variable */}
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            {/* Standard Close Button */}
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Title Input */}
            <div className="grid gap-2">
              <Label htmlFor="editTaskTitle">Title</Label>
              <Input // Use Input component
                id="editTaskTitle"
                value={editTaskTitle}
                onChange={e => setEditTaskTitle(e.target.value)}
                placeholder="Task title"
                required // Add required attribute
              />
            </div>
            {/* Notes Textarea */}
            <div className="grid gap-2">
              <Label htmlFor="editTaskNotes">Notes</Label>
              <Textarea
                id="editTaskNotes"
                value={editTaskNotes}
                onChange={e => setEditTaskNotes(e.target.value)}
                placeholder="Add notes or details..."
                className="min-h-[100px] resize-y" // Allow vertical resize
              />
            </div>
            {/* Due Date Picker */}
            <div className="grid gap-2">
              <Label htmlFor="editTaskDueDate">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="editTaskDueDate"
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${!editTaskDueDate ? 'text-muted-foreground' : ''}`}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editTaskDueDate ? formatTaskDueDate(editTaskDueDate) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editTaskDueDate}
                    onSelect={setEditTaskDueDate} // Updates the date state
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {/* Clear Date Button - Only show if date is selected */}
              {editTaskDueDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setEditTaskDueDate(undefined)}>
                  Clear date
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTaskChanges}
              disabled={!editTaskTitle.trim() || (editingTask ? updatingTaskIds.has(editingTask.id) : false)} // Disable if title empty or already saving
              className="bg-indigo-500 hover:bg-indigo-600 text-white">
              {/* Show spinner if *this specific task* is being saved */}
              {editingTask && updatingTaskIds.has(editingTask.id) ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" /> Saving...
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
