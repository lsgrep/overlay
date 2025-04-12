import React, { useState, memo } from 'react';
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
  onUpdate?: (id: string, content: string, sourceUrl?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onCopy?: () => void;
  contentVersion?: number; // Used to force re-render when content changes
}

export const UnifiedNoteView: React.FC<UnifiedNoteProps> = memo(
  ({ id, content, timestamp, sourceUrl, isLight = true, onUpdate, onDelete, onCopy, contentVersion = 0 }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editedContent, setEditedContent] = useState(content);
    const formattedDate = new Date(timestamp).toLocaleString();

    // Keep content in sync with parent when it changes
    React.useEffect(() => {
      setEditedContent(content);
    }, [content, contentVersion]);

    // Card styles - consistent with other components
    const noteCardStyle = cn(
      'border rounded-md overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md relative mb-3 w-full max-w-[95%]',
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
        // Log for debugging
        console.log('Saving note with sourceUrl:', sourceUrl);

        // Make sure to pass both the content and the sourceUrl
        await onUpdate(id, editedContent, sourceUrl);
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
          <CardHeader className="p-2 pb-0 flex flex-row items-start justify-between gap-1">
            <CardTitle className="text-sm font-medium text-foreground flex items-center">
              <FileText className="h-4 w-4 mr-1 text-primary" /> Note
            </CardTitle>
            <div className="flex space-x-0.5">
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-5 w-5">
                <Copy className="h-3 w-3" />
              </Button>
              {onUpdate && (
                <Button variant="ghost" size="icon" onClick={handleEdit} className="h-5 w-5" disabled={isLoading}>
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              {onDelete && id && (
                <Button variant="ghost" size="icon" onClick={handleDelete} className="h-5 w-5" disabled={isLoading}>
                  <Trash className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-1 overflow-x-hidden">
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{content}</p>
            <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
              <span className="flex-shrink-0">{formattedDate}</span>
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate max-w-[100px] ml-2 flex items-center gap-1 break-all">
                  <LinkIcon size={8} />
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
        <CardHeader className="p-2 pb-0 flex flex-row items-start justify-between">
          <CardTitle className="text-sm font-medium text-primary flex items-center">
            <Edit className="h-4 w-4 mr-1" /> Edit Note
          </CardTitle>
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={handleCancel} className="h-5 w-5" disabled={isLoading}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 space-y-2">
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
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Source: </span>
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 break-all">
                <LinkIcon size={10} />
                {(() => {
                  try {
                    return new URL(sourceUrl).hostname;
                  } catch {
                    return sourceUrl;
                  }
                })()}
              </a>
            ) : (
              <span className="text-muted-foreground/70 italic">No source URL</span>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-2 pt-0">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleSave}
            disabled={isLoading || !editedContent.trim()}>
            {isLoading ? (
              <>
                <Spinner size={16} className="mr-2 text-primary-foreground" />
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
  },
);

UnifiedNoteView.displayName = 'UnifiedNoteView';

// Note list component
export const UnifiedNoteListView: React.FC<{
  notes: NoteType[] | { id?: string; content: string; timestamp: number; sourceUrl?: string }[];
  isLight?: boolean;
  onUpdate?: (id: string, content: string, sourceUrl?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  contentVersion?: number;
}> = memo(({ notes, isLight = true, onUpdate, onDelete, contentVersion = 0 }) => {
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
    <div className="my-2 space-y-2 w-full max-w-full overflow-x-hidden px-1">
      {notes.map((note: any) => {
        // Only render notes that have a valid ID from the server
        if (!note.id) {
          console.warn('Note without ID found, skipping:', note);
          return null;
        }

        return (
          <div className="flex justify-center" key={note.id}>
            <UnifiedNoteView
              id={note.id}
              content={note.content}
              timestamp={note.timestamp || note.created_at || Date.now()}
              sourceUrl={note.sourceUrl || note.source_url}
              isLight={isLight}
              onUpdate={onUpdate}
              onDelete={onDelete}
              contentVersion={contentVersion}
            />
          </div>
        );
      })}
    </div>
  );
});

UnifiedNoteListView.displayName = 'UnifiedNoteListView';
