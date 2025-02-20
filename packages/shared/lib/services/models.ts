import { anthropicKeyStorage, geminiKeyStorage } from '@extension/storage';

export interface Model {
  name: string;
  displayName: string;
  provider: string;
}

interface OllamaModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OllamaResponse {
  object: string;
  data: OllamaModel[];
}

export class ModelService {
  private static ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/models';
  private static OLLAMA_API_URL = 'http://localhost:11434';
  private static GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

  static async fetchAnthropicModels(key: string): Promise<Model[]> {
    if (!key) {
      throw new Error('No API key found');
    }

    const response = await fetch(this.ANTHROPIC_API_URL, {
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Anthropic models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((model: any) => ({
      name: model.id,
      displayName: model.display_name,
      provider: 'anthropic',
    }));
  }

  static async fetchOllamaModels(): Promise<Model[]> {
    const response = await fetch(`${this.OLLAMA_API_URL}/v1/models`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Ollama models: ${response.statusText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.data.map(model => ({
      name: model.id,
      displayName: model.id,
      provider: 'ollama',
    }));
  }

  static async fetchGeminiModels(key: string): Promise<Model[]> {
    if (!key) {
      throw new Error('No API key found');
    }

    const response = await fetch(`${this.GEMINI_API_URL}?key=${key}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to fetch Gemini models: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.models || [])
      .filter((model: any) => {
        return model.name.includes('gemini') || model.displayName?.toLowerCase().includes('gemini');
      })
      .map((model: any) => ({
        name: model.name,
        displayName: model.displayName || model.name.split('/').pop(),
        provider: 'gemini',
      }));
  }

  static async fetchAllModels(): Promise<{ anthropic: Model[]; ollama: Model[]; gemini: Model[] }> {
    let anthropicModels: Model[] = [];
    let ollamaModels: Model[] = [];
    let geminiModels: Model[] = [];

    try {
      const anthropicKey = await anthropicKeyStorage.get();
      if (anthropicKey) {
        try {
          anthropicModels = await this.fetchAnthropicModels(anthropicKey);
        } catch (err) {
          console.error('Error fetching Anthropic models:', err);
        }
      }

      try {
        ollamaModels = await this.fetchOllamaModels();
      } catch (err) {
        console.error('Error fetching Ollama models:', err);
      }

      try {
        const geminiKey = await geminiKeyStorage.get();
        if (geminiKey) {
          geminiModels = await this.fetchGeminiModels(geminiKey);
        }
      } catch (err) {
        console.error('Error fetching Gemini models:', err);
      }
    } catch (err) {
      console.error('Error fetching models:', err);
    }

    return {
      anthropic: anthropicModels,
      ollama: ollamaModels,
      gemini: geminiModels,
    };
  }
}
