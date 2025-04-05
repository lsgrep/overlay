import { anthropicKeyStorage } from '@extension/storage';
import type { Message, LLMConfig, LLMService } from './types';
import { Anthropic } from '@anthropic-ai/sdk';
import type { PageContext } from './prompts';
import type { MessageParam, ContentBlockParam, ImageBlockParam } from '@anthropic-ai/sdk/resources/messages';

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

/**
 * Detect image MIME type from ArrayBuffer by examining the file signature (magic bytes)
 */
function detectImageMimeType(buffer: ArrayBuffer): string | null {
  // Get the first bytes to check the file signature
  const arr = new Uint8Array(buffer).subarray(0, 8);

  // Check for PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    arr[0] === 0x89 &&
    arr[1] === 0x50 &&
    arr[2] === 0x4e &&
    arr[3] === 0x47 &&
    arr[4] === 0x0d &&
    arr[5] === 0x0a &&
    arr[6] === 0x1a &&
    arr[7] === 0x0a
  ) {
    return 'image/png';
  }

  // Check for JPEG signature: FF D8 FF
  if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
    return 'image/jpeg';
  }

  // Check for GIF signature: 'GIF87a' or 'GIF89a'
  if (
    arr[0] === 0x47 &&
    arr[1] === 0x49 &&
    arr[2] === 0x46 &&
    arr[3] === 0x38 &&
    (arr[4] === 0x37 || arr[4] === 0x39) &&
    arr[5] === 0x61
  ) {
    return 'image/gif';
  }

  // Check for WebP signature: RIFF ???? WEBP
  if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) {
    // WebP has RIFF at offset 0 and WEBP at offset 8, but we only have 8 bytes...
    // We'd need more bytes to check for WebP properly
    return 'image/webp';
  }

  // Check for BMP signature: 'BM'
  if (arr[0] === 0x42 && arr[1] === 0x4d) {
    return 'image/bmp';
  }

  // Unknown image type
  return null;
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

      // Convert messages to Anthropic format with support for images
      const anthropicMessages: MessageParam[] = [];

      for (const msg of messages) {
        const role = msg.role.toLowerCase() === 'user' ? 'user' : 'assistant';

        // Check if the message contains images
        if (msg.images && msg.images.length > 0) {
          try {
            // Format message with image content
            const content: ContentBlockParam[] = [];

            // Fetch and process images
            const imagePromises = msg.images.map(async image => {
              try {
                // Fetch the image from the URL
                const response = await fetch(image.url);
                if (!response.ok) {
                  throw new Error(`Failed to fetch image: ${response.status}`);
                }

                // Convert to ArrayBuffer then to base64
                const imageBuffer = await response.arrayBuffer();
                const base64Data = arrayBufferToBase64(imageBuffer);

                // Detect image type based on header bytes
                const mimeType = detectImageMimeType(imageBuffer) || image.mimeType || 'image/png';
                console.log('Using image MIME type:', mimeType);

                return {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64Data,
                  },
                } as ImageBlockParam;
              } catch (imageError) {
                console.error('Error processing image:', imageError);
                return null;
              }
            });

            // Wait for all image processing to complete
            const imageContents = await Promise.all(imagePromises);

            // Add successfully processed images to content
            for (const imageContent of imageContents) {
              if (imageContent) {
                content.push(imageContent);
              }
            }

            // Add text content if present
            if (msg.content) {
              content.push({
                type: 'text',
                text: msg.content,
              });
            }

            // Only add the message if we have at least one content item
            if (content.length > 0) {
              anthropicMessages.push({
                role,
                content,
              });
            }
          } catch (error) {
            console.error('Error processing images for Anthropic:', error);
            // Fallback to text-only message
            if (msg.content) {
              anthropicMessages.push({
                role,
                content: msg.content,
              });
            }
          }
        } else {
          // Standard text-only message
          anthropicMessages.push({
            role,
            content: msg.content,
          });
        }
      }

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
