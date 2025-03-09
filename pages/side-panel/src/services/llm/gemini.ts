import { geminiKeyStorage } from '@extension/storage';
import type { JSONSchema, LLMConfig, LLMService, Message, StructuredOutputConfig } from './types';

export class GeminiService implements LLMService {
  private modelName: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(modelName: string) {
    this.modelName = modelName.includes('/') ? modelName : `models/${modelName}`.replace('//', '/');
  }

  async generateCompletion(
    messages: Message[],
    context: string,
    config?: LLMConfig,
    mode: 'interactive' | 'conversational' = 'conversational',
    structuredOutput?: StructuredOutputConfig,
  ): Promise<string> {
    // Adjust temperature based on the mode
    // Interactive mode uses lower temperature for more focused responses
    // Conversational mode uses higher temperature for more creative responses
    const temperatureAdjustment = mode === 'interactive' ? 0.2 : 0.0;
    const adjustedConfig = {
      ...config,
      temperature: (config?.temperature ?? 0.7) - temperatureAdjustment,
    };
    const geminiKey = await geminiKeyStorage.get();
    if (!geminiKey) {
      throw new Error('Gemini API key not found');
    }

    const apiUrl = `${this.baseUrl}/${this.modelName}:generateContent?key=${geminiKey}`;
    // Define type for request body with generationConfig
    interface RequestBody {
      contents: Array<{
        role: string;
        parts: Array<{ text: string }>;
      }>;
      generationConfig: {
        temperature: number;
        topK: number;
        topP: number;
        maxOutputTokens: number;
        response_mime_type?: string;
        response_schema?: JSONSchema;
      };
      safetySettings: Array<{
        category: string;
        threshold: string;
      }>;
    }
    // Prepare request body with base configuration
    const requestBody: RequestBody = {
      contents: messages.concat({ role: 'user', content: context }).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: adjustedConfig.temperature,
        topK: config?.topK ?? 40,
        topP: config?.topP ?? 0.95,
        maxOutputTokens: config?.maxOutputTokens ?? 2048,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    };
    // Add structured output configuration if provided
    if (structuredOutput) {
      requestBody.generationConfig.response_mime_type = 'application/json';
      // If a schema is provided, add it to the configuration
      if (structuredOutput.schema) {
        requestBody.generationConfig.response_schema = structuredOutput.schema;
      }
    }

    let response;
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000;

    while (retryCount < maxRetries) {
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          break;
        }

        const errorText = await response.text();
        const error = new Error(`Gemini API error: ${response.status} - ${errorText}`);

        if (response.status !== 429 && !errorText.includes('RESOURCE_EXHAUSTED')) {
          throw error;
        }

        retryCount++;
        if (retryCount === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, retryCount - 1);
        console.log(`Attempt ${retryCount} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error: unknown) {
        const errorObj = error as { message?: string };
        if (
          retryCount === maxRetries ||
          (!errorObj.message?.includes('429') && !errorObj.message?.includes('RESOURCE_EXHAUSTED'))
        ) {
          throw error;
        }
      }
    }

    if (!response) {
      throw new Error('Failed to get response from Gemini API');
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    // If structured output was requested but the response isn't valid JSON,
    // try to ensure we return valid JSON
    if (structuredOutput && responseText !== 'No response generated') {
      try {
        // Test if the response is already valid JSON
        JSON.parse(responseText);
        return responseText;
      } catch {
        // Non-JSON response - attempt to extract
        // Not valid JSON, try to extract JSON from the text if there's any
        const jsonMatch =
          responseText.match(/```json\n([\s\S]*?)\n```/) ||
          responseText.match(/{[\s\S]*}/) ||
          responseText.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
          const extractedJson = jsonMatch[1] || jsonMatch[0];

          try {
            // Validate the extracted JSON
            JSON.parse(extractedJson);
            return extractedJson;
          } catch {
            // Invalid JSON in extraction
            // If extraction failed, return the original response
            console.warn('Could not extract valid JSON from response');
          }
        }
      }
    }
    return responseText;
  }
}
