import { getGeminiKey } from '@extension/storage';
import { LLMConfig, LLMService, Message } from './types';

export class GeminiService implements LLMService {
  private modelName: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(modelName: string) {
    this.modelName = modelName.includes('/') ? modelName : `models/${modelName}`.replace('//', '/');
  }

  async generateCompletion(messages: Message[], context: string, config?: LLMConfig): Promise<string> {
    const geminiKey = await getGeminiKey();
    if (!geminiKey) {
      throw new Error('Gemini API key not found');
    }

    const apiUrl = `${this.baseUrl}/${this.modelName}:generateContent?key=${geminiKey}`;
    const requestBody = {
      contents: messages.concat({ role: 'user', content: context }).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: config?.temperature ?? 0.7,
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
      } catch (error: any) {
        if (
          retryCount === maxRetries ||
          (!error.message?.includes('429') && !error.message?.includes('RESOURCE_EXHAUSTED'))
        ) {
          throw error;
        }
      }
    }

    if (!response) {
      throw new Error('Failed to get response from Gemini API');
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
  }
}
