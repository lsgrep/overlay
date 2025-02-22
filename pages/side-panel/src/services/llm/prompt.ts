import { ChatMode, ModelInfo, PageContext, PromptGenerator } from './prompts/types';
import { AnthropicPromptGenerator } from './prompts/anthropic';
import { GeminiPromptGenerator } from './prompts/gemini';
import { OpenAIPromptGenerator } from './prompts/openai';
import { OllamaPromptGenerator } from './prompts/ollama';

export class PromptManager {
  private static getPromptGenerator(model?: ModelInfo): PromptGenerator {
    switch (model?.provider) {
      case 'anthropic':
        return new AnthropicPromptGenerator();
      case 'gemini':
        return new GeminiPromptGenerator();
      case 'openai':
        return new OpenAIPromptGenerator();
      case 'ollama':
        return new OllamaPromptGenerator();
      default:
        return new OllamaPromptGenerator(); // Default to Ollama's generic prompts
    }
  }

  static generateContext(mode: ChatMode, pageContext: PageContext, model?: ModelInfo): string {
    const promptGenerator = PromptManager.getPromptGenerator(model);
    let context = promptGenerator.generateSystemPrompt();

    if (pageContext.title || pageContext.url) {
      context += `\n\nCurrent page: ${pageContext.title || ''} ${pageContext.url ? `(${pageContext.url})` : ''}`;
    }

    if (pageContext.content) {
      context += `\n\nPage content:\n${pageContext.content}`;
    }

    // Add mode-specific prompt
    if (mode === 'interactive') {
      context += '\n\n' + promptGenerator.generateInteractivePrompt();
    } else {
      context += '\n\n' + promptGenerator.generateConversationalPrompt();
    }

    return context;
  }
}
