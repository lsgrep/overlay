import type React from 'react';
import { Copy, Edit, Trash } from 'lucide-react';
import { Button, Checkbox, Card, CardHeader, CardTitle, CardContent } from '@extension/ui/lib/ui';

interface TaskItemViewProps {
  title: string;
  timestamp: number;
  sourceUrl?: string;
  completed?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onToggleComplete?: (completed: boolean) => void;
}

export const TaskItemView: React.FC<TaskItemViewProps> = ({
  title,
  timestamp,
  sourceUrl,
  completed = false,
  onEdit,
  onDelete,
  onCopy,
  onToggleComplete,
}) => {
  const formattedDate = new Date(timestamp).toLocaleString();

  const handleCopy = () => {
    navigator.clipboard.writeText(title);
    if (onCopy) onCopy();
  };

  const handleToggleComplete = () => {
    if (onToggleComplete) onToggleComplete(!completed);
  };

  return (
    <Card className="border-gray-200 shadow-sm mb-2 bg-slate-50 dark:bg-slate-900 dark:border-gray-700">
      <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <span className="mr-2">✅</span> Task
        </CardTitle>
        <div className="flex space-x-1">
          {onCopy && (
            <Button variant="ghost" size="icon" onClick={handleCopy} className="h-6 w-6">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-6 w-6">
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-6 w-6">
              <Trash className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <div className="flex items-start space-x-2">
          {onToggleComplete && (
            <Checkbox
              id={`task-${timestamp}`}
              checked={completed}
              onCheckedChange={handleToggleComplete}
              className="mt-1"
            />
          )}
          <div className="flex-1">
            <label
              htmlFor={`task-${timestamp}`}
              className={`text-sm ${completed ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-300'} whitespace-pre-wrap`}>
              {title}
            </label>
            <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
              <span>{formattedDate}</span>
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline truncate max-w-[150px]">
                  {new URL(sourceUrl).hostname}
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
