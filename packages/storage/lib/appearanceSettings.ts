import { createStorage } from './base/base';

export const fontFamilyStorage = createStorage<string>('font-family', 'Inter', { liveUpdate: true });
export const fontSizeStorage = createStorage<string>('font-size', '16', { liveUpdate: true });
