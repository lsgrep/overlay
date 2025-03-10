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

      // Create the model instance
      const model = google(this.modelName);

      // Prepare messages format - convert from our format to AI SDK format
      const aiMessages: CoreMessage[] = [];

      // Add context as a system message first
      aiMessages.push({
        role: 'system',
        content: context,
      } as CoreMessage);

      // Add the conversation messages
      for (const msg of messages) {
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

        aiMessages.push({
          role: sdkRole,
          content: msg.content,
        } as CoreMessage);
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
      const responseText = String(completion);

      // Handle structured output if specified
      if (structuredOutput && responseText) {
        try {
          // If schema is provided, force the response into valid JSON
          // The SDK should already return valid JSON with schema, but we check just in case
          JSON.parse(responseText); // Will throw if not valid JSON
          return responseText;
        } catch {
          // Try to extract JSON from the response if it's not already valid JSON
          const jsonMatch =
            responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
            responseText.match(/\s*({[\s\S]*})\s*/) ||
            responseText.match(/\s*(\[[\s\S]*\])\s*/) ||
            responseText.match(/{[\s\S]*}/) ||
            responseText.match(/\[[\s\S]*\]/);

          if (jsonMatch) {
            let extractedJson = jsonMatch[1] || jsonMatch[0];
            extractedJson = extractedJson.replace(/,\s*(\}|\])(?=\s*$)/g, '$1').trim();

            try {
              JSON.parse(extractedJson); // Validate the extracted JSON
              return extractedJson;
            } catch {
              console.warn('Could not extract valid JSON from response');
            }
          }
        }
      }

      // Handle interactive mode responses
      if (mode === 'interactive' && responseText) {
        try {
          // Try to parse the response as JSON first
          const parsed = JSON.parse(responseText);

          // If it already has an answer field, return as is
          if (parsed.answer) {
            return responseText;
          }

          // Otherwise wrap the response in the expected format
          const adaptedResponse = {
            answer: typeof parsed === 'object' ? JSON.stringify(parsed) : parsed,
            confidence: 0.9,
          };
          return JSON.stringify(adaptedResponse);
        } catch {
          // Not valid JSON, try to extract JSON from the text
          const jsonMatch =
            responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
            responseText.match(/\s*({[\s\S]*})\s*/) ||
            responseText.match(/\s*(\[[\s\S]*\])\s*/) ||
            responseText.match(/{[\s\S]*}/) ||
            responseText.match(/\[[\s\S]*\]/);

          if (jsonMatch) {
            let extractedJson = jsonMatch[1] || jsonMatch[0];
            extractedJson = extractedJson.replace(/,\s*(\}|\])(?=\s*$)/g, '$1').trim();

            try {
              const parsed = JSON.parse(extractedJson);

              if (!parsed.answer) {
                return JSON.stringify({
                  answer: JSON.stringify(parsed),
                  confidence: 0.8,
                });
              }

              return extractedJson;
            } catch {
              // For interactive mode with no valid JSON, wrap the plain text
              return JSON.stringify({
                answer: responseText,
                confidence: 0.6,
              });
            }
          } else {
            // For interactive mode with no JSON, wrap the plain text
            return JSON.stringify({
              answer: responseText,
              confidence: 0.6,
            });
          }
        }
      }

      return responseText || 'No response generated';
    } catch (error) {
      console.error('Error in Gemini chat:', error);
      throw error;
    }
  }
}
