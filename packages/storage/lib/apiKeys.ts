import { createStorage } from './base/base';

export const openAIKeyStorage = createStorage<string>('openai-api-key', '', { liveUpdate: true });
export const geminiKeyStorage = createStorage<string>('gemini-api-key', '', { liveUpdate: true });
export const anthropicKeyStorage = createStorage<string>('anthropic-api-key', '', { liveUpdate: true });
