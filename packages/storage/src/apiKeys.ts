import { createStorage } from '../lib/base/base';

const openAIStorage = createStorage<string>('openai-api-key', '');
const geminiStorage = createStorage<string>('gemini-api-key', '');

export const getOpenAIKey = () => openAIStorage.get();
export const setOpenAIKey = (key: string) => openAIStorage.set(key);
export const getGeminiKey = () => geminiStorage.get();
export const setGeminiKey = (key: string) => geminiStorage.set(key);
