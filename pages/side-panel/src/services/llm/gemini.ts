import { geminiKeyStorage } from '@extension/storage';
import type { LLMConfig, LLMService, Message, StructuredOutputConfig } from './types';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, type CoreMessage } from 'ai';

export class GeminiService implements LLMService {
  private modelName: string;

  constructor(modelName: string) {
    // Remove any model/ prefix if present, the SDK will handle the format
    this.modelName = modelName.replace(/^models\//, '');
  }

  async generateCompletion(
    messages: Message[],
    context: string,
    config?: LLMConfig,
    mode: 'interactive' | 'conversational' = 'conversational',
    structuredOutput?: StructuredOutputConfig,
  ): Promise<string> {
    // Adjust temperature based on the mode
    const temperatureAdjustment = mode === 'interactive' ? 0.2 : 0.0;
    const adjustedTemperature = (config?.temperature ?? 0.7) - temperatureAdjustment;

    // Get API key from storage
    const geminiKey = await geminiKeyStorage.get();
    if (!geminiKey) {
      throw new Error('Gemini API key not found');
    }

    try {
      // Create Google Generative AI provider with API key
      const google = createGoogleGenerativeAI({
        apiKey: geminiKey,
      });

      // Create the model instance with appropriate configuration
      const model = google(this.modelName, {
        // Disable structured outputs when using complex schema that might have unions
        // or other unsupported features
        structuredOutputs: structuredOutput?.disableNativeStructuredOutput ? false : true,
      });

      // Prepare messages format - convert from our format to AI SDK format
      const aiMessages: CoreMessage[] = [];

      // For Gemini, prepend the system context to the first user message
      // or add as a user message if there are no user messages
      const hasUserMessage = messages.some(msg => msg.role === 'user');
      if (!hasUserMessage) {
        // If no user messages, add context as a user message
        aiMessages.push({
          role: 'user',
          content: `${context}\n\nPlease acknowledge that you understand these instructions.`,
        } as CoreMessage);
      }

      // Add the conversation messages
      for (const idx in messages) {
        const msg = messages[idx];
        // Map our role format to the AI SDK format
        // The SDK expects 'user', 'assistant', 'system', or 'tool'
        let sdkRole: 'user' | 'assistant' | 'system' | 'tool';

        switch (msg.role) {
          case 'user':
            sdkRole = 'user';
            break;
          case 'assistant':
            sdkRole = 'assistant';
            break;
          case 'system':
            sdkRole = 'system';
            break;
          default:
            sdkRole = 'user'; // Default fallback
        }

        // For the first user message, prepend the system context
        if (sdkRole === 'user' && idx === '0' && context) {
          aiMessages.push({
            role: sdkRole,
            content: `${context}\n\n${msg.content}`,
          } as CoreMessage);
        } else {
          aiMessages.push({
            role: sdkRole,
            content: msg.content,
          } as CoreMessage);
        }
      }

      // Generate completion using AI SDK
      const completion = await generateText({
        model,
        messages: aiMessages,
        temperature: adjustedTemperature,
        maxTokens: config?.maxOutputTokens ?? 2048,
        topP: config?.topP ?? 0.95,
        topK: config?.topK ?? 40,
      });

      // Process the text response - convert completion result to string
      // The SDK returns a special result object that needs to be converted to string
      console.log('Gemini response:', completion);

      // Handle structured output
      if (structuredOutput?.schema) {
        try {
          // If we're returning structured output directly from Gemini API
          if (!structuredOutput.disableNativeStructuredOutput) {
            return completion.text;
          }

          // If we need to post-process the text to extract JSON
          const text = completion.text;
          // Try to parse directly first
          try {
            const parsed = JSON.parse(text);
            return JSON.stringify(parsed);
          } catch (parseError) {
            console.warn('Failed to parse direct JSON response, attempting extraction:', parseError);

            // Try to extract JSON from markdown code blocks or plain text
            const jsonMatch =
              text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
              text.match(/\s*({[\s\S]*})\s*/) ||
              text.match(/\s*(\[[\s\S]*\])\s*/) ||
              text.match(/{[\s\S]*}/) ||
              text.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
              let extractedJson = jsonMatch[1] || jsonMatch[0];
              extractedJson = extractedJson.replace(/,\s*(\}|\])(?=\s*$)/g, '$1').trim();

              try {
                const parsed = JSON.parse(extractedJson);
                return JSON.stringify(parsed);
              } catch (extractionError) {
                console.error('Failed to extract JSON from response:', extractionError);
                return JSON.stringify({
                  error: 'Failed to parse structured output',
                  original_response: text,
                });
              }
            } else {
              console.warn('No JSON pattern found in response');
              return JSON.stringify({
                error: 'No JSON pattern found in model response',
                original_response: text,
              });
            }
          }
        } catch (error) {
          console.error('Error handling structured output:', error);
          return JSON.stringify({
            error: 'Error processing structured output',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // For interactive mode, format response appropriately
      if (mode === 'interactive') {
        try {
          // Try to parse as JSON first
          const parsed = JSON.parse(completion.text);

          // If already has answer field, return as is
          if (parsed.answer) {
            return JSON.stringify(parsed);
          }

          // Otherwise wrap in expected format
          return JSON.stringify({
            answer: typeof parsed === 'object' ? JSON.stringify(parsed) : parsed,
            confidence: 0.9,
          });
        } catch {
          // Not JSON, wrap the plain text
          return JSON.stringify({
            answer: completion.text,
            confidence: 0.7,
          });
        }
      }

      // Default case, return raw text
      return completion.text;
    } catch (error) {
      console.error('Error in Gemini chat:', error);
      // Provide more detailed error information
      if (error instanceof Error) {
        throw new Error(`Gemini API error: ${error.message}`);
      }
      throw error;
    }
  }
}
