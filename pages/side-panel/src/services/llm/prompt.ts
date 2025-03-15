import type { ActionContext, ChatMode, ModelInfo, PageContext, PromptGenerator } from './prompts/types';
import { GeminiPromptGenerator } from './prompts/gemini';
import { AnthropicPromptGenerator } from './prompts/anthropic';
import { OpenAIPromptGenerator } from './prompts/openai';
import { OllamaPromptGenerator } from './prompts/ollama';
// Enhanced implementations will need to be updated
const EnhancedAnthropicPromptGenerator = AnthropicPromptGenerator;

export interface PromptOptions {
  goal?: string;
  actionContext?: ActionContext;
  truncateContent?: boolean;
  includeMetadata?: boolean;
  maxContentLength?: number;
  enhancedMode?: boolean;
}

export class PromptManager {
  private static getPromptGenerator(model?: ModelInfo, options?: PromptOptions): PromptGenerator {
    const useEnhanced = options?.enhancedMode === true;

    // Default to Anthropic which has the most complete implementation
    let generator: PromptGenerator;

    switch (model?.provider) {
      case 'anthropic':
        generator = useEnhanced ? new EnhancedAnthropicPromptGenerator() : new AnthropicPromptGenerator();
        break;
      case 'gemini':
        generator = new GeminiPromptGenerator();
        break;
      case 'openai':
        generator = new OpenAIPromptGenerator() as PromptGenerator;
        break;
      case 'ollama':
        generator = new OllamaPromptGenerator() as PromptGenerator;
        break;
      default:
        // Fall back to Anthropic which has all the required methods
        generator = new AnthropicPromptGenerator();
        break;
    }

    return generator;
  }

  private static truncateContent(content: string, maxLength: number = 8000): string {
    if (content.length <= maxLength) return content;

    // Calculate chunks to preserve context from beginning and end
    const startChunk = Math.floor(maxLength * 0.7);
    const endChunk = Math.floor(maxLength * 0.3);

    const beginning = content.substring(0, startChunk);
    const ending = content.substring(content.length - endChunk);

    return `${beginning}\n\n...[CONTENT TRUNCATED DUE TO LENGTH]...\n\n${ending}`;
  }

  static generateContext(
    mode: ChatMode,
    pageContext: PageContext | null | undefined,
    model?: ModelInfo,
    options: PromptOptions = {},
  ): string {
    const promptGenerator = PromptManager.getPromptGenerator(model, options);
    let context = promptGenerator.generateSystemPrompt(options.goal);

    // Add page information with formatting if pageContext exists
    if (pageContext && (pageContext.title || pageContext.url)) {
      context += `\n\n## Current Page\nTitle: ${pageContext.title || 'Unknown'}\nURL: ${pageContext.url || 'Unknown'}`;
    }

    // Add page metadata if available and requested
    if (pageContext && options.includeMetadata && pageContext.metadata) {
      context += '\n\n## Page Metadata\n';

      if (pageContext.metadata.description) {
        context += `Description: ${pageContext.metadata.description}\n`;
      }

      if (pageContext.metadata.keywords && pageContext.metadata.keywords.length > 0) {
        context += `Keywords: ${pageContext.metadata.keywords.join(', ')}\n`;
      }

      if (pageContext.metadata.lastModified) {
        context += `Last Modified: ${pageContext.metadata.lastModified}\n`;
      }

      if (pageContext.metadata.selectedText) {
        context += `\n### Selected Text\n${pageContext.metadata.selectedText}\n`;
      }
    }

    // Add page content with potential truncation
    if (pageContext && pageContext.content) {
      const contentToInclude = options.truncateContent
        ? PromptManager.truncateContent(pageContext.content, options.maxContentLength)
        : pageContext.content;

      context += `\n\n## Page Content\n${contentToInclude}`;
    }

    // Add mode-specific prompt with enhanced context if available
    if (mode === 'interactive') {
      context += '\n\n' + promptGenerator.generateInteractivePrompt(options.actionContext);

      // Add task decomposition prompt if available and in enhanced mode
      if (options.enhancedMode && options.goal && promptGenerator.generateTaskDecompositionPrompt) {
        context += '\n\n' + promptGenerator.generateTaskDecompositionPrompt(options.goal);
      }
    } else {
      context += '\n\n' + promptGenerator.generateConversationalPrompt();
    }
    return context;
  }

  static generateExtractionPrompt(
    pageContext: PageContext | null | undefined,
    question: string,
    model?: ModelInfo,
  ): string {
    const promptGenerator = PromptManager.getPromptGenerator(model);

    // Check if the generator supports extraction, fall back to Anthropic if not
    let actualGenerator = promptGenerator;
    if (!('generateExtractionPrompt' in actualGenerator)) {
      console.warn('Selected prompt generator does not support extraction, falling back to Anthropic');
      actualGenerator = new AnthropicPromptGenerator();
    }

    // Safe access to pageContext content
    const content = pageContext?.content || '';
    return actualGenerator.generateExtractionPrompt(content, question);
  }

  static generateWebNavigationPrompt(pageContext: PageContext | null | undefined, model?: ModelInfo): string {
    const promptGenerator = PromptManager.getPromptGenerator(model);

    // Only use the generator's method if pageContext exists and method is available
    if (pageContext && promptGenerator.generateWebNavigationPrompt) {
      return promptGenerator.generateWebNavigationPrompt(pageContext);
    }

    // Fallback to generic navigation prompt with safe property access
    return `You are a web navigation assistant. Help the user navigate to their desired destination.
Current page: ${pageContext?.title || 'Unknown'} (${pageContext?.url || 'Unknown URL'})`;
  }
}
