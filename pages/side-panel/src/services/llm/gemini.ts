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
    if ((structuredOutput || mode === 'interactive') && responseText !== 'No response generated') {
      try {
        // Test if the response is already valid JSON
        JSON.parse(responseText);
        return responseText;
      } catch {
        // Non-JSON response - attempt to extract
        // Not valid JSON, try to extract JSON from the text if there's any
        // Try various regex patterns to extract JSON from the response
        const jsonMatch =
          // Match JSON in code blocks with flexible whitespace
          responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
          // Match JSON with flexible whitespace around brackets
          responseText.match(/\s*({[\s\S]*})\s*/) ||
          responseText.match(/\s*(\[[\s\S]*\])\s*/) ||
          // Traditional JSON matching as fallback
          responseText.match(/{[\s\S]*}/) ||
          responseText.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
          // Use the captured group if available (from code blocks), otherwise use the full match
          let extractedJson = jsonMatch[1] || jsonMatch[0];
          // Clean up the extracted JSON - remove any trailing commas which are invalid in JSON
          extractedJson = extractedJson.replace(/,\s*(\}|\])(?=\s*$)/g, '$1');
          // Remove any leading/trailing whitespace
          extractedJson = extractedJson.trim();

          try {
            // Validate the extracted JSON
            const parsed = JSON.parse(extractedJson);

            // If in interactive mode and we need to adapt the format for LLMExtractionHandler
            if (mode === 'interactive' && !parsed.answer && !structuredOutput) {
              // If we have a task plan or other structured data but not in the expected format
              // for LLMExtractionHandler, transform it to the expected format
              console.log('Adapting interactive response format:', parsed);
              const adaptedResponse = {
                answer: typeof parsed === 'object' ? JSON.stringify(parsed) : parsed,
                confidence: 0.9,
              };
              return JSON.stringify(adaptedResponse);
            }

            return extractedJson;
          } catch (parseError) {
            // Invalid JSON in extraction
            console.warn('Could not extract valid JSON from response:', parseError);

            // For interactive mode, wrap the response in the expected format as fallback
            if (mode === 'interactive') {
              const fallbackResponse = {
                answer: responseText,
                confidence: 0.7,
              };
              return JSON.stringify(fallbackResponse);
            }
          }
        } else if (mode === 'interactive') {
          // If no JSON found and in interactive mode, wrap the plain text in the expected format
          const fallbackResponse = {
            answer: responseText,
            confidence: 0.6,
          };
          return JSON.stringify(fallbackResponse);
        }
      }
    }
    return responseText;
  }
}
