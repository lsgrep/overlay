import { createStorage } from './base/base';

export const defaultLanguageStorage = createStorage<string>('default-language', 'english');
export const defaultModelStorage = createStorage<string>('default-model', '');
