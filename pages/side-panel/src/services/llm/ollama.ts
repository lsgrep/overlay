import { LLMConfig, LLMService, Message } from './types';

export class OllamaService implements LLMService {
  private modelName: string;
  private apiUrl: string;

  constructor(modelName: string, apiUrl = 'http://localhost:11434/api/chat') {
    this.modelName = modelName;
    this.apiUrl = apiUrl;
  }

  private getRequestFormat(mode: 'interactive' | 'conversational' | 'context-menu') {
    if (mode === 'interactive') {
      return {
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
      };
    } else if (mode === 'conversational' || mode === 'context-menu') {
      return {
        type: 'object',
        properties: {
          response: { type: 'string' },
          reasoning: { type: 'string', optional: true },
        },
        required: ['response'],
      };
    }
    return undefined;
  }

  async generateCompletion(
    messages: Message[],
    context: string,
    config?: LLMConfig,
    mode: 'interactive' | 'conversational' | 'context-menu' = 'conversational',
  ): Promise<string> {
    const requestBody: any = {
      model: this.modelName,
      messages: [...messages, { role: 'user', content: context }],
      stream: true,
      format: this.getRequestFormat(mode),
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
    let accumulatedJson = '';
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
            let content = data.message.content;
            if (mode === 'interactive') {
              // For interactive mode, accumulate JSON chunks
              accumulatedJson += content;
              try {
                // Try to parse accumulated JSON
                if (accumulatedJson.startsWith('{')) {
                  const parsed = JSON.parse(accumulatedJson);
                  if (parsed.goal && parsed.steps) {
                    fullResponse = JSON.stringify(parsed, null, 2);
                  }
                }
              } catch (e) {
                // Ignore parse error as it might be incomplete JSON
              }
            } else {
              // For conversational/context-menu modes
              accumulatedJson += content;
              if (accumulatedJson.startsWith('{')) {
                try {
                  const parsed = JSON.parse(accumulatedJson);
                  if (parsed.response) {
                    // Replace entire response with just the response field
                    fullResponse = parsed.response;
                  }
                } catch (e) {
                  // Ignore parse error as it might be incomplete JSON
                }
              } else {
                fullResponse += content;
              }
            }
          }
        } catch (e) {
          console.error('Error parsing streaming JSON:', e);
        }
      }
    }

    return fullResponse;
  }
}
