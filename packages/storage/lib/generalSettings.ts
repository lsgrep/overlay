import { createStorage } from './base/base';

const languageStorage = createStorage<string>('default-language', 'english');
const modelStorage = createStorage<string>('default-model', '');

export const getDefaultLanguage = () => languageStorage.get();
export const setDefaultLanguage = (language: string) => languageStorage.set(language);

export const getDefaultModel = () => modelStorage.get();
export const setDefaultModel = (model: string) => modelStorage.set(model);
