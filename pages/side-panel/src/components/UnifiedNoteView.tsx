import React, { useState } from 'react';
import { Copy, Edit, Trash, Save, X, FileText, Link as LinkIcon } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, CardFooter, Textarea } from '@extension/ui/lib/ui';
import { cn } from '@extension/ui/lib/utils';
import { saveNote, deleteNote, Note as NoteType } from '@extension/shared/lib/services/supabase';

// Spinner component for loading states
const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export interface UnifiedNoteProps {
  id?: string;
  content: string;
  timestamp: number;
  sourceUrl?: string;
  isLight?: boolean;
  onUpdate?: (id: string, content: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onCopy?: () => void;
}

export const UnifiedNoteView: React.FC<UnifiedNoteProps> = ({
  id,
  content,
  timestamp,
  sourceUrl,
  isLight = true,
  onUpdate,
  onDelete,
  onCopy,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const formattedDate = new Date(timestamp).toLocaleString();

  // Card styles
  const noteCardStyle = cn(
    'border rounded-md overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md relative mb-3 w-full',
    'border-border bg-card',
  );

  // Handle copy
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    if (onCopy) onCopy();
  };

  // Handle edit
  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(content);
  };

  // Handle cancel
  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(content);
  };

  // Handle save
  const handleSave = async () => {
    if (!onUpdate || !id) return;

    setIsLoading(true);
    try {
      await onUpdate(id, editedContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!onDelete || !id) return;

    setIsLoading(true);
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // View mode
  if (!isEditing) {
    return (
      <Card className={noteCardStyle}>
        <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center">
            <FileText className="h-4 w-4 mr-1 text-amber-500" /> Note
          </CardTitle>
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={handleCopy} className="h-6 w-6">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {onUpdate && (
              <Button variant="ghost" size="icon" onClick={handleEdit} className="h-6 w-6" disabled={isLoading}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && id && (
              <Button variant="ghost" size="icon" onClick={handleDelete} className="h-6 w-6" disabled={isLoading}>
                <Trash className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
          <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
            <span>{formattedDate}</span>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate max-w-[150px] flex items-center gap-1">
                <LinkIcon size={10} />
                {(() => {
                  try {
                    return new URL(sourceUrl).hostname;
                  } catch {
                    return sourceUrl;
                  }
                })()}
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edit mode
  return (
    <Card className={cn(noteCardStyle, 'bg-background relative')}>
      {isLoading && (
        <div className="absolute inset-0 bg-foreground/5 flex items-center justify-center z-10 rounded-md">
          <div className="bg-background rounded-full p-2 shadow-md">
            <Spinner size={24} />
          </div>
        </div>
      )}
      <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium text-amber-500 flex items-center">
          <Edit className="h-4 w-4 mr-1" /> Edit Note
        </CardTitle>
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" onClick={handleCancel} className="h-6 w-6" disabled={isLoading}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div>
          <label htmlFor="note-content" className="block text-xs font-medium text-muted-foreground mb-1">
            Content
          </label>
          <Textarea
            id="note-content"
            value={editedContent}
            onChange={e => setEditedContent(e.target.value)}
            className="w-full min-h-[100px]"
            disabled={isLoading}
            placeholder="Enter your note content..."
          />
        </div>
        {sourceUrl && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Source: </span>
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {(() => {
                try {
                  return new URL(sourceUrl).hostname;
                } catch {
                  return sourceUrl;
                }
              })()}
            </a>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button
          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          onClick={handleSave}
          disabled={isLoading || !editedContent.trim()}>
          {isLoading ? (
            <>
              <Spinner size={16} className="mr-2 text-white" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Note list component
export const UnifiedNoteListView: React.FC<{
  notes: NoteType[] | { id?: string; content: string; timestamp: number; sourceUrl?: string }[];
  isLight?: boolean;
  onUpdate?: (id: string, content: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}> = ({ notes, isLight = true, onUpdate, onDelete }) => {
  // Render empty state
  if (notes.length === 0) {
    return (
      <div className="my-2 w-full">
        <div className="p-4 text-center text-muted-foreground border border-dashed border-border rounded-md bg-muted w-full">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No notes available</p>
        </div>
      </div>
    );
  }

  // Render note list
  return (
    <div className="my-2 space-y-2 w-full max-w-full">
      {notes.map((note: any) => (
        <UnifiedNoteView
          key={note.id || `note-${note.timestamp}`}
          id={note.id}
          content={note.content}
          timestamp={note.timestamp || note.created_at || Date.now()}
          sourceUrl={note.sourceUrl || note.source_url}
          isLight={isLight}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
