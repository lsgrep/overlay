import { anthropicKeyStorage } from '@extension/storage';
import type { Message, LLMConfig, LLMService } from './types';
import Anthropic from '@anthropic-ai/sdk';
import type { Messages } from '@anthropic-ai/sdk/resources';
import type { PageContext } from './prompts';

/**
 * Helper function to convert ArrayBuffer to base64 string in browser environment
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // Create a Uint8Array from the ArrayBuffer
  const bytes = new Uint8Array(buffer);
  // Convert to a binary string
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Convert to base64
  return btoa(binary);
}

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
  async generateCompletion(
    messages: Message[],
    context: string,
    config?: LLMConfig,
    pageContext?: PageContext,
  ): Promise<string> {
    try {
      // Get the Anthropic client
      const client = await this.getClient();

      // Check if we're dealing with a PDF
      if (pageContext?.isPdf && pageContext.url) {
        try {
          console.log('Processing PDF directly with Claude API:', pageContext.url);

          // Attempt to fetch and process the PDF using base64 encoding
          const pdfResponse = await fetch(pageContext.url).then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch PDF: ${response.status}`);
            }
            return response.arrayBuffer();
          });

          // Convert ArrayBuffer to base64 (browser-compatible)
          const base64Data = arrayBufferToBase64(pdfResponse);

          // Create a message with PDF content for Claude
          const pdfContentResult = await client.messages.create({
            model: this.model,
            system: context,
            max_tokens: config?.maxOutputTokens || 4096,
            temperature: config?.temperature,
            top_k: config?.topK,
            top_p: config?.topP,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'document',
                    source: {
                      type: 'base64',
                      media_type: 'application/pdf',
                      data: base64Data,
                    },
                  },
                  {
                    type: 'text',
                    text: messages[messages.length - 1].content, // Use the last user message as the question
                  },
                ],
              },
            ],
          });

          // Extract the response text
          if (pdfContentResult.content && pdfContentResult.content.length > 0) {
            const block = pdfContentResult.content[0];
            if (block.type === 'text') {
              return block.text;
            }
          }
          return '';
        } catch (pdfError) {
          console.error('Error processing PDF with Claude:', pdfError);
          // Continue with standard processing as fallback
        }
      }

      // Convert messages to Anthropic format (standard approach)
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
