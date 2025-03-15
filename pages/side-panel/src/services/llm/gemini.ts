import { geminiKeyStorage } from '@extension/storage';
import type { LLMConfig, LLMService, Message, StructuredOutputConfig } from './types';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import { TaskPlanSchema } from '../task/types';

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
   * Format our Message type to Google's Part type
   */
  private formatMessages(
    messages: Message[],
    context: string,
  ): Array<{ role: string; parts: Array<{ text: string }> }> {
    // For Gemini, we need to convert our messages to their format
    // and handle the system context appropriately
    const formattedMessages: Array<{ role: string; parts: Array<{ text: string }> }> = [];

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

      formattedMessages.push({
        role,
        parts: [{ text: content }],
      });
    }

    return formattedMessages;
  }

  /**
   * Generate text completion using Gemini
   */
  async generateCompletion(messages: Message[], context: string, config?: LLMConfig): Promise<string> {
    try {
      // Adjust temperature based on the mode
      const temperatureAdjustment = 0.0;
      const adjustedTemperature = (config?.temperature ?? 0.7) - temperatureAdjustment;

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

      // Format the messages for Gemini API
      const formattedMessages = this.formatMessages(messages, context);

      // Generate content
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
  async generateTaskPlan(
    userRequest: string,
    pageContext: {
      title?: string;
      url?: string;
      content?: string;
    },
  ): Promise<string> {
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
