import { Message, LLMService, LLMConfig } from './types';

export class OllamaService implements LLMService {
  private readonly model: string;
  private readonly apiUrl: string;

  constructor(model: string, apiUrl: string) {
    this.model = model;
    this.apiUrl = apiUrl;
  }

  async generateCompletion(messages: Message[], context: string, config?: LLMConfig): Promise<string> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are a helpful AI assistant. Context: ${context}`,
            },
            ...messages.map(msg => ({
              role: msg.role.toLowerCase(),
              content: msg.content,
            })),
          ],
          options: {
            temperature: config?.temperature ?? 0.7,
            top_k: config?.topK ?? 40,
            top_p: config?.topP ?? 0.95,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message.content;
    } catch (error) {
      console.error('Ollama API error:', error);
      throw error;
    }
  }
}
