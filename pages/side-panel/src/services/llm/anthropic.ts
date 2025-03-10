import { anthropicKeyStorage } from '@extension/storage';
import type { Message, LLMConfig, LLMService } from './types';

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

export class AnthropicService implements LLMService {
  private API_URL = 'https://api.anthropic.com/v1/messages';
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  async generateCompletion(messages: Message[], context: string, config?: LLMConfig): Promise<string> {
    const key = await anthropicKeyStorage.get();
    if (!key) {
      throw new Error('Anthropic API key not found');
    }

    // Convert messages to Anthropic format
    const anthropicMessages: AnthropicMessage[] = messages.map(msg => ({
      role: msg.role.toLowerCase() === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Add context as system prompt
    const systemPrompt = context;

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
          model: this.model,
          messages: anthropicMessages,
          max_tokens: config?.maxOutputTokens || 4096,
          temperature: config?.temperature,
          top_k: config?.topK,
          top_p: config?.topP,
          system: systemPrompt,
        }),
      });
      console.log('Anthropic response:', response);

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
