import { useState } from 'react';
import { CheckSquare, Square, Trash2, Edit, X, Calendar, FileText, Clock, Save } from 'lucide-react';
import { type Task, overlayApi, type UpdateTaskData } from '@extension/shared/lib/services/api';

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
  const handleInputChange = (field: keyof Task, value: string) => {
    if (editedTask) {
      setEditedTask(prev => ({ ...prev, [field]: value }));
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
        <div className="p-4 text-center text-gray-500 border border-dashed rounded-md bg-white dark:bg-gray-800">
          No tasks available
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`border rounded-md overflow-hidden shadow-sm ${isLight ? 'border-blue-100 bg-white' : 'border-blue-800 bg-gray-800'}`}>
              <div className="flex items-start gap-2 p-3 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/10">
                <button
                  onClick={() => toggleTaskStatus(task.id, task.status)}
                  disabled={loading[task.id]}
                  className={`flex-shrink-0 mt-0.5 ${loading[task.id] ? 'opacity-50' : 'hover:scale-110'} transition-transform cursor-pointer`}>
                  {task.status === 'completed' ? (
                    <CheckSquare size={18} className="text-green-500" />
                  ) : (
                    <Square size={18} className="text-gray-400" />
                  )}
                </button>

                <button
                  className="flex-1 cursor-pointer text-left"
                  onClick={() => toggleExpandTask(task.id)}
                  onKeyDown={e => e.key === 'Enter' && toggleExpandTask(task.id)}
                  tabIndex={0}
                  aria-expanded={expandedTaskId === task.id}>
                  <p className="text-sm font-medium">{task.title}</p>

                  {task.due && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Calendar size={12} />
                      <span>Due: {overlayApi.formatDate(task.due)}</span>
                    </div>
                  )}
                </button>

                <div className="flex gap-1">
                  {expandedTaskId === task.id && editMode === task.id ? (
                    <button
                      onClick={() => saveTask(task.id)}
                      disabled={loading[task.id]}
                      className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800">
                      <Save size={16} className="text-green-500" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        console.log(
                          'Button clicked for task:',
                          task.id,
                          'expanded:',
                          expandedTaskId === task.id,
                          'editMode:',
                          editMode === task.id,
                        );

                        // If already in edit mode, exit edit mode
                        if (editMode === task.id) {
                          console.log('Exiting edit mode');
                          setEditMode(null);
                          return;
                        }

                        // If not expanded, expand first
                        if (expandedTaskId !== task.id) {
                          console.log('Expanding task first');
                          setExpandedTaskId(task.id);
                        }

                        // Enter edit mode (this will also expand if not already expanded)
                        console.log('Entering edit mode');
                        enterEditMode(task);
                      }}
                      className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800">
                      {editMode === task.id ? (
                        // In edit mode, show X icon
                        <X size={16} className="text-gray-500" />
                      ) : expandedTaskId === task.id ? (
                        // Expanded but not in edit mode, show blue edit icon
                        <Edit size={16} className="text-blue-500" />
                      ) : (
                        // Not expanded, show normal edit icon
                        <Edit size={16} className="text-gray-500" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => deleteTask(task.id)}
                    disabled={loading[task.id]}
                    className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900">
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>

              {expandedTaskId === task.id && (
                <div className="p-3 border-t border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
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
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white min-h-[60px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="taskDueDate" className="block text-xs font-medium text-gray-500 mb-1">
                          Due Date
                        </label>
                        <input
                          id="taskDueDate"
                          type="date"
                          value={editedTask?.due ? new Date(editedTask.due).toISOString().split('T')[0] : ''}
                          onChange={e => handleInputChange('due', e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
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

                      <div className="text-xs text-gray-500 flex flex-col gap-1 mt-3 pt-2 border-t border-gray-200">
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
