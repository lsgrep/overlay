import type React from 'react';
import { Copy, Edit, Trash } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@extension/ui/lib/ui';

interface NoteViewProps {
  content: string;
  timestamp: number;
  sourceUrl?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
}

export const NoteView: React.FC<NoteViewProps> = ({ content, timestamp, sourceUrl, onEdit, onDelete, onCopy }) => {
  const formattedDate = new Date(timestamp).toLocaleString();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    if (onCopy) onCopy();
  };

  return (
    <Card className="border-gray-200 shadow-sm mb-2 bg-slate-50 dark:bg-slate-900 dark:border-gray-700">
      <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <span className="mr-2">📝</span> Note
        </CardTitle>
        <div className="flex space-x-1">
          {onCopy && (
            <Button
              onClick={handleCopy}
              className="h-6 w-6 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          {onEdit && (
            <Button
              onClick={onEdit}
              className="h-6 w-6 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={onDelete}
              className="h-6 w-6 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <Trash className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{content}</p>
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
      </CardContent>
    </Card>
  );
};
