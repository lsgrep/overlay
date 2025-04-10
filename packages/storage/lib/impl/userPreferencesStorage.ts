import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';

// Define user preferences interface
export interface UserPreferences {
  theme?: string;
  default_task_list?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Using any to support unknown future properties
}

// Simple storage for user preferences
export const userPreferencesStorage = createStorage<UserPreferences | null>('overlay-user-preferences', null, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});
