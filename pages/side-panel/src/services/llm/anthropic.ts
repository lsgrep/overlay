import { Message } from './types';
import { anthropicKeyStorage } from '@extension/storage';

export class AnthropicService {
  static async chat(messages: Message[], model: string, context: string): Promise<string> {
    const apiKey = anthropicKeyStorage.get();
    if (!apiKey) {
      throw new Error('Anthropic API key not found. Please set it in the options page.');
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: `Context: ${context}\n\n${messages[messages.length - 1].content}`,
            },
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }
}
