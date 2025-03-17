import type React from 'react';
import { ListChecks, CheckSquare, Square } from 'lucide-react';

// Define the TaskItem interface
interface TaskItem {
  text: string;
  completed: boolean;
  dueDate?: string; // Optional due date
}

// ========================
// Task-specific Components
// ========================

// Component to render a task list
export const TaskListView: React.FC<{ tasks: TaskItem[]; isLight: boolean }> = ({ tasks, isLight }) => {
  return (
    <div className="my-2">
      <div className="flex items-center gap-2 mb-2 text-sm font-medium">
        <ListChecks size={16} />
        <span>Tasks</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2 p-2 rounded ${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800'} transition-colors`}>
            <div className="flex-shrink-0 mt-0.5">
              {task.completed ? (
                <CheckSquare size={18} className="text-green-500" />
              ) : (
                <Square size={18} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.text}</p>
              {task.dueDate && <p className="text-xs text-gray-500 mt-1">Due: {task.dueDate}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========================
// Content Type Components
// ========================

// Component for task-based messages
export const TaskMessageContent: React.FC<{
  tasks: TaskItem[];
  isLight: boolean;
}> = ({ tasks, isLight }) => {
  return <TaskListView tasks={tasks} isLight={isLight} />;
};

export type { TaskItem };
