import { createStorage } from './base/base';

export const firstNameStorage = createStorage<string>('profile-first-name', '', { liveUpdate: true });
export const lastNameStorage = createStorage<string>('profile-last-name', '', { liveUpdate: true });
export const emailStorage = createStorage<string>('profile-email', '', { liveUpdate: true });
export const bioStorage = createStorage<string>('profile-bio', '', { liveUpdate: true });
export const resumeStorage = createStorage<string>('profile-resume', '', { liveUpdate: true });
export const resumeFileStorage = createStorage<{
  fileName: string;
  fileType: string;
  fileSize: number;
  data: string; // base64 encoded file data
} | null>('profile-resume-file', null, { liveUpdate: true });
