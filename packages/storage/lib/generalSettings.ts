import { createStorage } from './base/base';

export const defaultLanguageStorage = createStorage<string>('default-language', 'en');
export const defaultModelStorage = createStorage<string>('default-model', '');
export const proxyModeStorage = createStorage<boolean>('proxy-mode', false);
