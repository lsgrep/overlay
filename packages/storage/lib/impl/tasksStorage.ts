import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';

// Simple Task interface definition
export interface Task {
  id: string;
  taskId: string; // Added to match API Task type
  title: string;
  notes?: string;
  due?: string;
  completed?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow for additional properties
}

// Define tasks cache interface
export interface TasksCache {
  [listId: string]: Task[];
}

// Simple storage for tasks data
export const tasksStorage = createStorage<TasksCache>(
  'overlay-tasks',
  {}, // Default empty object
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);
