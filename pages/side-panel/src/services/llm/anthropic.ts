import { anthropicKeyStorage } from '@extension/storage';
import type { Message, LLMConfig, LLMService } from './types';
import Anthropic from '@anthropic-ai/sdk';
import type { Messages } from '@anthropic-ai/sdk/resources';

export class AnthropicService implements LLMService {
  private model: string;
  private client: Anthropic | null = null;

  constructor(model: string) {
    this.model = model;
  }

  /**
   * Get or initialize the Anthropic client
   */
  private async getClient(): Promise<Anthropic> {
    if (this.client) return this.client;

    // Get API key from storage
    const apiKey = await anthropicKeyStorage.get();
    if (!apiKey) {
      throw new Error('Anthropic API key not found');
    }

    // Initialize the client
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true, // Required for browser usage
    });

    return this.client;
  }

  /**
   * Generate text completion using Anthropic Claude
   */
  async generateCompletion(messages: Message[], context: string, config?: LLMConfig): Promise<string> {
    try {
      // Get the Anthropic client
      const client = await this.getClient();

      // Convert messages to Anthropic format
      const anthropicMessages = messages.map(msg => ({
        role: msg.role.toLowerCase() === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })) as Messages.MessageParam[];

      // Create the message with the SDK
      const response = await client.messages.create({
        model: this.model,
        messages: anthropicMessages,
        system: context,
        max_tokens: config?.maxOutputTokens || 4096,
        temperature: config?.temperature,
        top_k: config?.topK,
        top_p: config?.topP,
      });

      // Extract the response text from the content
      if (response.content && response.content.length > 0) {
        // Check if the content is a text block
        const block = response.content[0];
        if (block.type === 'text') {
          return block.text;
        }
      }

      return '';
    } catch (error) {
      console.error('Error in Anthropic chat:', error);
      if (error instanceof Error) {
        throw new Error(`Anthropic API error: ${error.message}`);
      }
      throw error;
    }
  }
}
