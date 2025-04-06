import { useState, useEffect, useCallback } from 'react';
import { overlayApi, type TaskList, type Task } from '@extension/shared/lib/services/api';
import { PlusIcon, TrashIcon, ChevronRightIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { Button, Card, CardHeader, CardTitle, CardContent, Checkbox } from '@extension/ui';

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
  }, [selectedListId]);

  // Fetch task lists on component mount
  useEffect(() => {
    fetchTaskLists();
  }, [fetchTaskLists]);

  // Fetch tasks when selected list changes
  useEffect(() => {
    if (selectedListId) {
      fetchTasks(selectedListId);
    }
  }, [selectedListId]);

  const fetchTasks = async (listId: string) => {
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
  };

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

      // Optimistic UI update - update the local state immediately
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: completed ? 'completed' : 'needsAction' } : task,
        ),
      );

      console.log('Updating task status:', {
        taskId,
        listId: selectedListId,
        status: completed ? 'completed' : 'needsAction',
      });

      // Then perform the API call - only send the status in the update payload
      const result = await overlayApi.updateTask(
        taskId,
        {
          status: completed ? 'completed' : 'needsAction',
        },
        selectedListId,
      );
      console.log('Task update result:', result);

      // Refresh tasks to ensure consistency
      fetchTasks(selectedListId);
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
      // Optimistic UI update - remove task from local state
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));

      // Using query parameters for task deletion as per updated API
      await overlayApi.deleteTask(taskId, selectedListId);

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

  return (
    <div className="w-full max-w-6xl mx-auto relative z-10">
      <div className="flex items-center justify-center mb-6">
        <img src="/icon-128.png" alt="Overlay" className="w-8 h-8 mr-3" />
        <h2 className="text-2xl font-semibold bg-gradient-text bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
          Overlay Tasks
        </h2>
      </div>

      {error && <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-lg">{error}</div>}

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${loading ? 'opacity-70' : ''}`}>
        {/* Task Lists Panel (Left) */}
        <Card className="md:col-span-1 backdrop-blur-sm bg-card/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-500">Task Lists</CardTitle>
          </CardHeader>
          <CardContent>
            {taskLists.length === 0 ? (
              <p className="text-sm text-blue-500">{loading ? 'Loading task lists...' : 'No task lists found.'}</p>
            ) : (
              <ul className="space-y-2">
                {taskLists.map(list => (
                  <li key={list.id}>
                    <button
                      onClick={() => setSelectedListId(list.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex justify-between items-center ${
                        selectedListId === list.id
                          ? 'bg-blue-500 text-white shadow-sm'
                          : isLight
                            ? 'hover:bg-gray-100 text-gray-900 hover:shadow-sm'
                            : 'hover:bg-gray-900 text-gray-100 hover:shadow-sm'
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
        <Card className="md:col-span-2 backdrop-blur-sm bg-card/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-500">
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
              <p className="text-center py-8 text-blue-500 font-medium">Select a task list to view tasks</p>
            ) : tasks.length === 0 ? (
              <p className="text-center py-8 text-blue-500 font-medium">
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
                    } ${task.status === 'completed' ? 'border-l-4 border-blue-500' : ''}`}>
                    <div className="flex items-start gap-3">
                      {updatingTaskId === task.id ? (
                        <div className="mt-1 flex-shrink-0 w-4 h-4">
                          <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin" />
                        </div>
                      ) : (
                        <Checkbox
                          checked={task.status === 'completed'}
                          onCheckedChange={() => handleUpdateTaskStatus(task.id, task.status !== 'completed')}
                          className={`mt-1 flex-shrink-0 ${task.status === 'completed' ? 'data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500' : ''}`}
                        />
                      )}

                      <div className="flex-grow">
                        <div
                          className={`font-medium transition-all duration-200 ${task.status === 'completed' ? 'text-gray-400 line-through' : ''}`}>
                          {task.title}
                        </div>

                        {task.notes && <p className="text-sm mt-1 text-blue-500">{task.notes}</p>}

                        {task.due && (
                          <div className="text-xs mt-2 flex items-center text-blue-500">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            {formatTaskDueDate(task.due)}
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => handleDeleteTask(task.id)}
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40">
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
