import { anthropicKeyStorage } from '@extension/storage';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
}

export class AnthropicService {
  private static API_URL = 'https://api.anthropic.com/v1/messages';

  static async chat(messages: AnthropicMessage[], model: string) {
    const key = await anthropicKeyStorage.get();
    if (!key) {
      throw new Error('Anthropic API key not found');
    }

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
      }

      const data: AnthropicResponse = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Error in Anthropic chat:', error);
      throw error;
    }
  }
}
