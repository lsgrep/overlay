import { Message, LLMService, LLMConfig } from './types';

interface OllamaMessage {
  role: string;
  content: string;
}

interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_duration: number;
  eval_duration: number;
}

export class OllamaService implements LLMService {
  private readonly model: string;
  private readonly apiUrl: string;
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000;

  constructor(model: string, apiUrl: string) {
    this.model = model;
    this.apiUrl = apiUrl;
  }

  async generateCompletion(messages: Message[], context: string, config?: LLMConfig): Promise<string> {
    const ollamaMessages: OllamaMessage[] = [
      {
        role: 'system',
        content: `You are a helpful AI assistant. Context: ${context}`,
      },
      ...messages.map(msg => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
      })),
    ];

    const requestBody = {
      model: this.model,
      messages: ollamaMessages,
      options: {
        temperature: config?.temperature ?? 0.7,
        top_k: config?.topK ?? 40,
        top_p: config?.topP ?? 0.95,
        num_predict: config?.maxOutputTokens ?? 1000,
      },
    };

    let response;
    let retryCount = 0;

    while (retryCount < this.maxRetries) {
      try {
        response = await fetch(this.apiUrl, {
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
        const error = new Error(`Ollama API error: ${response.status} - ${errorText}`);

        retryCount++;
        if (retryCount === this.maxRetries) {
          throw error;
        }

        const delay = this.baseDelay * Math.pow(2, retryCount - 1);
        console.log(`Attempt ${retryCount} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error: any) {
        if (retryCount === this.maxRetries) {
          console.error('Error in Ollama chat:', error);
          throw error;
        }
      }
    }

    if (!response) {
      throw new Error('Failed to get response from Ollama API');
    }

    const data: OllamaResponse = await response.json();
    return data.message?.content || 'No response generated';
  }
}
