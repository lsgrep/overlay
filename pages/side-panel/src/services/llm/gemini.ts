import { geminiKeyStorage } from '@extension/storage';
import type { LLMConfig, LLMService, Message, MessageImage, StructuredOutputConfig } from './types';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { Schema, Part } from '@google/generative-ai';
import { TaskPlanSchema } from '../task/types';
import type { PageContext } from './prompts';

/**
 * Constants for Gemini models
 */
export const GEMINI_MODELS = {
  PRO: 'gemini-1.5-pro',
  FLASH: 'gemini-1.5-flash',
};

/**
 * Options for invoking the Gemini service
 */
export interface GeminiInvocationOptions {
  /** Input messages for the conversation */
  messages: Message[];
  /** System context or instructions */
  context: string;
  /** LLM configuration parameters */
  config?: LLMConfig;
  /** Mode of operation - interactive or conversational */
  mode?: 'interactive' | 'conversational';
  /** Configuration for structured output */
  structuredOutput?: StructuredOutputConfig;
}

/**
 * Implementation of LLMService for Google's Gemini models using the official Google Generative AI SDK
 */
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

export class GeminiService implements LLMService {
  private modelName: string;
  private genAI: GoogleGenerativeAI | null = null;
  private safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ];

  constructor(modelName: string) {
    // Remove any model/ prefix if present, the SDK will handle the format
    this.modelName = modelName.replace(/^models\//, '');
  }

  /**
   * Get or initialize the Gemini API client
   */
  private async getClient(): Promise<GoogleGenerativeAI> {
    if (this.genAI) return this.genAI;

    // Get API key from storage
    const geminiKey = await geminiKeyStorage.get();
    if (!geminiKey) {
      throw new Error('Gemini API key not found');
    }

    // Initialize the client
    this.genAI = new GoogleGenerativeAI(geminiKey);
    return this.genAI;
  }

  /**
   * Process and prepare image for Gemini API
   * This will fetch the image data if it's a URL
   */
  private async processImage(image: MessageImage): Promise<Part> {
    try {
      // Gemini can accept image URLs directly in some cases
      if (image.url.startsWith('data:image/')) {
        // Data URL case (already encoded)
        return {
          inlineData: {
            data: image.url.split(',')[1], // Extract base64 data without the prefix
            mimeType: image.mimeType || 'image/jpeg', // Use provided mimeType or default
          },
        };
      } else {
        // Remote URL case - fetch the image and convert to base64
        const response = await fetch(image.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        const mimeType = image.mimeType || blob.type || 'image/jpeg';
        // Convert the blob to base64
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({
              inlineData: {
                data: base64Data,
                mimeType,
              },
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.error('Error processing image for Gemini:', error);
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format our Message type to Google's Part type
   */
  private async formatMessages(messages: Message[], context: string): Promise<Array<{ role: string; parts: Part[] }>> {
    // For Gemini, we need to convert our messages to their format
    // and handle the system context appropriately
    const formattedMessages: Array<{ role: string; parts: Part[] }> = [];

    // First, check if there are user messages
    const hasUserMessage = messages.some(msg => msg.role === 'user');

    // If there's context but no messages or no user messages, add context as a user message
    if (context && (!messages.length || !hasUserMessage)) {
      formattedMessages.push({
        role: 'user',
        parts: [{ text: context }],
      });
    }

    // Process each message
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      let role: string;

      // Map our roles to Gemini roles
      switch (msg.role) {
        case 'user':
          role = 'user';
          break;
        case 'assistant':
          role = 'model';
          break;
        case 'system':
          // Gemini doesn't support system messages directly
          // Skip system messages as they'll be incorporated into context
          continue;
        default:
          role = 'user'; // Default fallback
      }

      // For the first user message, prepend the system context if provided
      let content = msg.content;
      if (role === 'user' && i === 0 && context && hasUserMessage) {
        content = `${context}\n\n${content}`;
      }

      // Process the text content to handle images properly
      let cleanedContent = content;

      // Create an array to hold all parts (text and images)
      const parts: Part[] = [];

      // Process images if present
      if (msg.images && msg.images.length > 0) {
        console.log(`Processing ${msg.images.length} images for message`);

        // Clean the text content to remove markdown image references
        // This regex matches markdown image syntax: ![alt text](url)
        const imageRegex = /!\[.*?\]\(.*?\)\n?/g;
        cleanedContent = cleanedContent.replace(imageRegex, '');

        // Add cleaned text content as the first part if it's not empty after removing image references
        if (cleanedContent.trim()) {
          parts.push({ text: cleanedContent });
        }

        // Process each image and add it as a part
        for (const image of msg.images) {
          try {
            const imagePart = await this.processImage(image);
            parts.push(imagePart);
          } catch (error) {
            console.error('Error adding image to message:', error);
            // Continue with other images if one fails
          }
        }
      } else {
        // No images, just add the text content
        parts.push({ text: cleanedContent });
      }

      // Add the formatted message with all parts
      formattedMessages.push({
        role,
        parts,
      });
    }

    return formattedMessages;
  }

  /**
   * Generate text completion using Gemini
   */
  async generateCompletion(
    messages: Message[],
    prompt: string,
    config?: LLMConfig,
    context?: PageContext,
  ): Promise<string> {
    try {
      // Adjust temperature based on the mode
      const temperatureAdjustment = 0.0;
      const adjustedTemperature = (config?.temperature ?? 0.7) - temperatureAdjustment;
      console.log('[gemini]');
      console.log(context);
      // Get the Gemini API client
      const genAI = await this.getClient();

      // Set up generation config
      const generationConfig: Record<string, unknown> = {
        temperature: adjustedTemperature,
        maxOutputTokens: config?.maxOutputTokens ?? 2048,
        topP: config?.topP ?? 0.95,
        topK: config?.topK ?? 40,
      };

      // Initialize the model
      const model = genAI.getGenerativeModel({
        model: this.modelName,
        safetySettings: this.safetySettings,
        generationConfig,
      });

      // Check if this is a PDF and we should use direct PDF processing
      if (context?.isPdf && context.url) {
        try {
          console.log('Processing PDF directly with Gemini API:', context.url);

          // Fetch the PDF file
          const pdfResponse = await fetch(context.url).then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch PDF: ${response.status}`);
            }
            return response.arrayBuffer();
          });

          // Convert ArrayBuffer to base64 (browser-compatible)
          const base64Data = arrayBufferToBase64(pdfResponse);

          // Generate content using direct PDF processing with the provided prompt
          const pdfContentResult = await model.generateContent([
            {
              inlineData: {
                data: base64Data,
                mimeType: 'application/pdf',
              },
            },
            prompt,
          ]);

          return pdfContentResult.response.text();
        } catch (pdfError) {
          console.error('Error processing PDF with Gemini:', pdfError);
          console.log('Falling back to standard text processing');
          // Continue with standard processing as fallback
        }
      }

      // Format the messages for Gemini API (standard approach)
      const formattedMessages = await this.formatMessages(messages, prompt);

      // Generate content with standard approach
      const contentResult = await model.generateContent({
        contents: formattedMessages,
      });

      const response = contentResult.response;
      const result = response.text();
      // Default case: return the raw text result
      return result;
    } catch (error) {
      console.error('Error in Gemini chat:', error);
      if (error instanceof Error) {
        throw new Error(`Gemini API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate a task plan for web automation using Gemini's structured output capability
   */
  async generateTaskPlan(userRequest: string, pageContext: PageContext): Promise<string> {
    try {
      // Get the Gemini API client
      const genAI = await this.getClient();

      // Create the prompt context
      const pageTitlePrompt = pageContext.title ? `Page title: ${pageContext.title}\n` : '';
      const pageUrlPrompt = pageContext.url ? `Page URL: ${pageContext.url}\n` : '';
      const pageContentPrompt = pageContext.content
        ? `\nPage content summary: ${pageContext.content.substring(0)}...`
        : '';

      // Construct the prompt
      const prompt = `You are a web automation assistant that helps users automate tasks on websites. 

Based on the following webpage and user request, generate a task plan that includes the specific actions 
needed to accomplish the user's goal. The actions should be detailed enough for a browser automation 
system to execute them.

${pageTitlePrompt}${pageUrlPrompt}${pageContentPrompt}

User Request: ${userRequest}

Make your actions as specific as possible, with precise selectors and other needed parameters.`;

      // Configure the model with the TaskPlanSchema
      const model = genAI.getGenerativeModel({
        model: this.modelName,
        safetySettings: this.safetySettings,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: TaskPlanSchema as Schema,
        },
      });

      // Generate content with structured output
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      // Get the response
      const response = result.response;
      const jsonText = response.text();

      // Parse the response
      // return JSON.parse(jsonText) as TaskPlan;
      console.log('[Task Plan]' + jsonText);
      return jsonText;
    } catch (error) {
      console.error('Failed to generate task plan:', error);
      throw new Error(
        `Failed to generate a valid task plan. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
