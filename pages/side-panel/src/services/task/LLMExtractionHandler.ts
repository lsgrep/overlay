import { AnthropicPromptGenerator } from '../llm/prompts';
import type { Action } from './types';
import type { PageContext } from '../llm/prompts/types';
import type { LLMService } from '../llm/types';

/**
 * Responsible for handling LLM-based data extraction operations
 */
export class LLMExtractionHandler {
  private llmService: LLMService;
  private pageContext?: PageContext;
  private goal?: string;

  constructor(llmService: LLMService, pageContext?: PageContext, goal?: string) {
    this.llmService = llmService;
    this.pageContext = pageContext;
    this.goal = goal;
  }

  /**
   * Set the page context for extraction
   */
  public setPageContext(pageContext: PageContext): void {
    this.pageContext = pageContext;
  }

  /**
   * Get the current page context
   */
  public getPageContext(): PageContext | undefined {
    return this.pageContext;
  }

  /**
   * Handle LLM-based data extraction
   */
  public async handleLLMExtraction(
    action: Action,
    ctx?: PageContext,
  ): Promise<Array<{ text: string; html: string; attributes: Record<string, string> }>> {
    console.log('Debug: Starting LLM extraction with action:', action);

    // Determine the question/goal for extraction
    const extractionGoal =
      (action.parameters.query as string) ||
      action.description ||
      this.goal ||
      'Extract the main information from this page';

    // Get the content to extract from
    const contentToExtract = action.parameters.pageContent || ctx?.content || this.pageContext?.content || '';

    // Check if we have enough content to extract from
    if (!contentToExtract && !action.parameters.extractionSchema) {
      console.warn('LLM extraction attempted with no content or schema to extract from');
      return [];
    }

    if (!contentToExtract) {
      throw new Error('No content available for LLM extraction');
    }

    // Create the extraction prompt
    const promptManager = new AnthropicPromptGenerator();

    // Add page details context if available
    const pageDetails = {
      url: ctx?.url || this.pageContext?.url || 'No URL available',
      title: ctx?.title || this.pageContext?.title || 'No title available',
    };

    console.log('Using page details for extraction:', pageDetails);
    // Include page details in the extraction goal text since the API might not support additional parameters
    const enhancedGoal = `${extractionGoal}\nPage URL: ${pageDetails.url}\nPage Title: ${pageDetails.title}`;
    const prompt = promptManager.generateExtractionPrompt(contentToExtract, enhancedGoal);

    console.log('Attempting LLM extraction with prompt:', prompt);
    const llmResult = await this.llmService.generateCompletion(
      [{ role: 'user', content: prompt }],
      '', // No additional context needed since it's in the prompt
      undefined, // Use default config
      'interactive', // Always use interactive mode for task extraction
    );

    console.log('LLM extraction result:', llmResult);

    try {
      const parsedResult = JSON.parse(llmResult);

      if (parsedResult.error) {
        console.warn('LLM extraction failed:', parsedResult.error);
        throw new Error(parsedResult.error);
      }

      return [
        {
          text: parsedResult.answer,
          html: parsedResult.answer, // Since this is LLM-extracted, we use the same text
          attributes: {
            confidence: parsedResult.confidence?.toString() || '0.8',
            method: 'llm',
            goal: extractionGoal,
          },
        },
      ];
    } catch (parseError) {
      console.error(
        'Failed to parse LLM result:',
        parseError instanceof Error ? parseError.message : String(parseError),
      );
      throw new Error('Failed to parse LLM extraction result');
    }
  }
}
