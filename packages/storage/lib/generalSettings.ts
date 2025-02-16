import { createStorage } from './base/base';

const languageStorage = createStorage<string>('default-language', 'en');

export const getDefaultLanguage = () => languageStorage.get();
export const setDefaultLanguage = (language: string) => languageStorage.set(language);
