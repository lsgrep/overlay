import { LLMConfig, LLMService, Message } from './types';

export class OllamaService implements LLMService {
  private modelName: string;
  private apiUrl: string;

  constructor(modelName: string, apiUrl = 'http://localhost:11434/api/chat') {
    this.modelName = modelName;
    this.apiUrl = apiUrl;
  }

  async generateCompletion(messages: Message[], context: string, config?: LLMConfig): Promise<string> {
    const requestBody = {
      model: this.modelName,
      messages: [...messages, { role: 'user', content: context }],
      stream: true,
      format: {
        type: 'object',
        properties: {
          goal: { type: 'string' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                action: { type: 'string', enum: ['click', 'type', 'navigate', 'wait', 'extract'] },
                target: { type: 'string', optional: true },
                value: { type: 'string', optional: true },
                selector: { type: 'string', optional: true },
              },
              required: ['description', 'action'],
            },
          },
          estimated_time: { type: 'string' },
        },
        required: ['goal', 'steps', 'estimated_time'],
      },
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let fullResponse = '';
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            fullResponse += data.message.content;
          }
        } catch (e) {
          console.error('Error parsing JSON:', e, line);
        }
      }
    }

    return fullResponse;
  }
}
