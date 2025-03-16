import type { Tables, TablesInsert, TablesUpdate, Database } from './database.types';

// -------- Useful Type Aliases --------

// Simplified Table Row Types
export type CompletionRow = Tables<'completions'>;
export type NoteAttachmentRow = Tables<'note_attachments'>;
export type NoteRow = Tables<'notes'>;

// Simplified Insert Types
export type CompletionInsert = TablesInsert<'completions'>;
export type NoteAttachmentInsert = TablesInsert<'note_attachments'>;
export type NoteInsert = TablesInsert<'notes'>;

// Simplified Update Types
export type CompletionUpdate = TablesUpdate<'completions'>;
export type NoteAttachmentUpdate = TablesUpdate<'note_attachments'>;
export type NoteUpdate = TablesUpdate<'notes'>;

// Table-specific relationship types
export type NoteAttachmentRelationships = Database['public']['Tables']['note_attachments']['Relationships'];

// Utility type for table names
export type TableNames = keyof Database['public']['Tables'];

// Utility type for getting any table's row structure
export type TableRow<T extends TableNames> = Tables<T>;

// Utility type for getting any table's insert structure
export type TableInsert<T extends TableNames> = TablesInsert<T>;

// Utility type for getting any table's update structure
export type TableUpdate<T extends TableNames> = TablesUpdate<T>;
