import { Message, LLMService, LLMConfig } from './types';
import { geminiKeyStorage } from '@extension/storage';

export class GeminiService implements LLMService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(model: string) {
    this.apiKey = geminiKeyStorage.get() || '';
    this.model = model;
  }

  async generateCompletion(messages: Message[], context: string, config?: LLMConfig): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not found. Please set it in the options page.');
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${context}\n\n${messages[messages.length - 1].content}` }],
              },
            ],
            generationConfig: {
              temperature: config?.temperature ?? 0.7,
              topK: config?.topK ?? 40,
              topP: config?.topP ?? 0.95,
              maxOutputTokens: config?.maxOutputTokens ?? 1000,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }
}
