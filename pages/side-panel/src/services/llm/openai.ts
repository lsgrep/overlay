import type { Message, LLMService, LLMConfig } from './types';
import { openAIKeyStorage } from '@extension/storage';
export class OpenAIService implements LLMService {
  private apiKey: string = '';
  private readonly model: string;

  constructor(model: string) {
    this.model = model;
    this.loadApiKey();
  }

  private async loadApiKey() {
    const key = await openAIKeyStorage.get();
    this.apiKey = typeof key === 'string' ? key : '';
    console.log('OpenAI API Key type:', typeof key, 'value:', key);
  }

  async generateCompletion(messages: Message[], context: string, config?: LLMConfig): Promise<string> {
    await this.loadApiKey();
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found. Please set it in the options page.');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are a helpful AI assistant. Context: ${context}`,
            },
            ...messages.map(msg => ({
              role: msg.role.toLowerCase(),
              content: msg.content,
            })),
          ],
          temperature: config?.temperature ?? 0.7,
          max_tokens: config?.maxOutputTokens ?? 1000,
          top_p: config?.topP ?? 1,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }
}
