import { navigateTo } from '../../utils/navigation';
import { performSearch } from '../../utils/search';
import type { Action, TaskPlan } from './types';
import type { PageContext } from '../llm/prompts/types';
import type { ExecutionStateManager } from './ExecutionStateManager';
import type { LLMExtractionHandler } from './LLMExtractionHandler';

/**
 * Handles the execution of different types of actions
 */
export class ActionHandler {
  private stateManager: ExecutionStateManager;
  private llmExtractionHandler: LLMExtractionHandler;
  private pageContext?: PageContext;

  constructor(
    stateManager: ExecutionStateManager,
    llmExtractionHandler: LLMExtractionHandler,
    pageContext?: PageContext,
  ) {
    this.stateManager = stateManager;
    this.llmExtractionHandler = llmExtractionHandler;
    this.pageContext = pageContext;
  }

  /**
   * Set the page context
   */
  public setPageContext(pageContext: PageContext): void {
    this.pageContext = pageContext;
    this.llmExtractionHandler.setPageContext(pageContext);
  }

  /**
   * Get the page context
   */
  public getPageContext(): PageContext | undefined {
    return this.pageContext;
  }

  /**
   * Handle an individual action
   */
  public async handleAction(action: Action, pageContext?: PageContext): Promise<boolean> {
    try {
      this.stateManager.updateActionStatus(action.id, 'loading');

      // Track start time for timing metrics
      const startTime = Date.now();

      // Get the current page context
      const ctx = pageContext || this.pageContext;
      console.log('Debug: About to execute action:', { action, ctx });

      const success = await this.executeActionByType(action, ctx);

      // Calculate execution time and update progress
      const executionTime = Date.now() - startTime;
      console.log(`Action ${action.id} completed in ${executionTime}ms`);

      // For actions that complete without explicitly setting a status, mark as complete
      if (this.stateManager.getState().actionStatuses[action.id] === 'loading') {
        this.stateManager.updateActionStatus(action.id, 'complete');
      }

      return success;
    } catch (error) {
      console.error('Action execution error:', error instanceof Error ? error.message : String(error));
      this.stateManager.setState({
        error: error instanceof Error ? error.message : String(error),
      });
      this.stateManager.updateActionStatus(action.id, 'error');
      return false;
    }
  }

  /**
   * Execute an action based on its type
   */
  private async executeActionByType(action: Action, ctx?: PageContext): Promise<boolean> {
    // Log the action and context for debugging
    console.log('Executing action by type:', { actionType: action.type, contextExists: !!ctx });

    // Add a safe check - if no context is available for actions that need it, provide a warning
    if (!ctx && ['click_element', 'extract_data_llm', 'extract_data'].includes(action.type)) {
      console.warn(`Warning: Action ${action.type} may require page context, but none was provided.`);
    }
    switch (action.type) {
      case 'search':
        return this.handleSearchAction(action);
      case 'navigate_to':
        return this.handleNavigationAction(action);
      case 'wait':
        return this.handleWaitAction(action);
      case 'click_element':
        return this.handleClickAction(action, ctx);
      case 'extract_data_llm':
        return this.handleLLMExtractionAction(action, ctx);
      case 'extract_data':
        return this.handleDataExtractionAction(action, ctx);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Handle search action
   */
  private async handleSearchAction(action: Action): Promise<boolean> {
    if (action.parameters.query) {
      await performSearch(action.parameters.query);
      return true;
    } else if (action.parameters.text) {
      await performSearch(action.parameters.text);
      return true;
    }
    throw new Error('Search query is required for search action');
  }

  /**
   * Handle navigation action
   */
  private async handleNavigationAction(action: Action): Promise<boolean> {
    if (action.parameters.url) {
      try {
        console.log('Starting navigation to:', action.parameters.url);
        const tab = await navigateTo(action.parameters.url);
        console.log('Navigation completed, tab:', tab);

        // Add a small delay after navigation to ensure page is interactive
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('Delay complete, updating page context...');

        // Update page context after page is fully loaded
        console.log('Updating page context...');
        console.log('Tab details:', tab);

        if (tab.id) {
          // Get both the HTML and text content of the page
          console.log('Fetching page content for tab:', tab.id);
          const [htmlResult, textResult] = await Promise.all([
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => document.documentElement.outerHTML,
            }),
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => document.body.innerText,
            }),
          ]);

          console.log('Content fetched:', {
            textLength: textResult?.[0]?.result?.length,
            htmlLength: htmlResult?.[0]?.result?.length,
          });

          this.pageContext = {
            url: tab.url,
            title: tab.title,
            content: textResult?.[0]?.result || '', // Get actual text content of the current page
            originalHtml: htmlResult?.[0]?.result,
          };

          // Mark navigation as complete
          this.stateManager.updateActionStatus(action.id, 'complete');
          console.log('Navigation action completed successfully');

          return true;
        }
      } catch (error) {
        console.error('Navigation error:', error instanceof Error ? error.message : String(error));
        throw error;
      }
    }
    throw new Error('URL is required for navigation action');
  }

  /**
   * Handle wait action
   */
  private async handleWaitAction(action: Action): Promise<boolean> {
    // Handle duration with proper null/undefined check
    if (action.parameters.duration !== undefined && action.parameters.duration !== null) {
      const durationMs =
        typeof action.parameters.duration === 'number'
          ? action.parameters.duration * 1000
          : Number(action.parameters.duration) * 1000;
      await new Promise(resolve => setTimeout(resolve, durationMs));
    } else {
      // Default timeout if no duration is provided
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return true;
  }

  /**
   * Handle click action
   */
  private async handleClickAction(action: Action, ctx?: PageContext): Promise<boolean> {
    if (action.parameters.selector && ctx) {
      // TODO: Implement click action using content script
      throw new Error('Click action not implemented yet');
    }
    throw new Error('Selector is required for click action');
  }

  /**
   * Handle LLM extraction action
   */
  private async handleLLMExtractionAction(action: Action, ctx?: PageContext): Promise<boolean> {
    // Safety check - if context is missing, we can't extract data
    if (!ctx) {
      console.warn('LLM extraction action skipped: No page context available');
      this.stateManager.updateActionStatus(action.id, 'skipped');
      return true; // Return true to continue with other actions
    }
    try {
      console.log('Debug: Starting direct LLM extraction');
      const extractedData = await this.llmExtractionHandler.handleLLMExtraction(action, ctx);

      // Update state with LLM extraction result
      this.stateManager.updateActionStatus(action.id, 'complete');
      this.stateManager.updateExtractedData(action.id, extractedData);

      console.log('LLM extraction completed successfully:', extractedData);
      return true;
    } catch (llmError) {
      console.error('Direct LLM extraction failed:', llmError instanceof Error ? llmError.message : String(llmError));
      throw llmError;
    }
  }

  /**
   * Handle data extraction action
   */
  private async handleDataExtractionAction(action: Action, ctx?: PageContext): Promise<boolean> {
    // Safety check - if context is missing, we can't extract data
    if (!ctx) {
      console.warn('Data extraction action skipped: No page context available');
      this.stateManager.updateActionStatus(action.id, 'skipped');
      return true; // Return true to continue with other actions
    }
    try {
      const extractionResult = await this.handleExtractData(action, ctx);

      // Handle result type explicitly
      // Ensure the extraction result has the correct type structure
      const typedResult = {
        result: extractionResult.result as Array<{
          text: string;
          html: string;
          attributes: Record<string, string>;
        }>,
      };

      if (!typedResult || !typedResult.result || !typedResult.result.length) {
        console.log('Debug: No extraction result found with selector, attempting LLM fallback extraction');

        // Create a fallback action for LLM extraction
        const llmFallbackAction = {
          ...action,
          type: 'extract_data_llm' as Action['type'],
          parameters: {
            ...action.parameters,
            failedSelector: action.parameters.selector,
            extractionGoal: `Extract data that should have been found with selector "${action.parameters.selector}": ${action.description}`,
          },
        };

        // Run the LLM extraction
        const extractedData = await this.llmExtractionHandler.handleLLMExtraction(llmFallbackAction, ctx);

        // Update state with LLM extraction result
        this.stateManager.updateActionStatus(action.id, 'complete');
        this.stateManager.updateExtractedData(action.id, extractedData);

        console.log('Fallback LLM extraction completed successfully');
      } else {
        console.log('Debug: Extraction result with selector:', extractionResult);
        // Update state with selector-based extraction result
        this.stateManager.updateActionStatus(action.id, 'complete');
        this.stateManager.updateExtractedData(action.id, extractionResult.result);
      }

      return true;
    } catch (error) {
      console.error('Extraction failed:', error);
      throw error;
    }
  }

  /**
   * Handle retry strategy for failed actions
   */
  public async handleRetry(action: Action, plan: TaskPlan): Promise<boolean> {
    const state = this.stateManager.getState();
    const currentRetries = state.retryCount[action.id] || 0;

    if (currentRetries >= plan.error_handling.max_retries) {
      if (plan.error_handling.fallback) {
        // Execute fallback action
        const fallbackAction: Action = {
          id: `${action.id}_fallback`,
          type: plan.error_handling.fallback.type as Action['type'],
          parameters: plan.error_handling.fallback.parameters,
          description: `Fallback for: ${action.description}`,
        };
        return this.handleAction(fallbackAction);
      }
      return false;
    }

    // Calculate delay based on retry strategy
    const delay = plan.error_handling.retry_strategy === 'exponential' ? Math.pow(2, currentRetries) * 1000 : 1000; // Linear strategy uses fixed delay

    await new Promise(resolve => setTimeout(resolve, delay));
    this.stateManager.incrementRetryCount(action.id);
    return this.handleAction(action);
  }

  /**
   * Handle data extraction through DOM selectors
   */
  private async handleExtractData(
    action: Action,
    ctx?: PageContext,
  ): Promise<{ result: Array<{ text: string; html: string; attributes: Record<string, string> }> }> {
    // Get the current active tab first
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    // If no context, try to get it from the current tab
    if (!ctx && tab.url && tab.title) {
      const [htmlResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.documentElement.outerHTML,
      });

      ctx = {
        url: tab.url,
        title: tab.title,
        content: '',
        originalHtml: htmlResult.result,
      };
    }

    // For LLM-based extraction, we don't need a selector
    if (action.type !== 'extract_data_llm' && !action.parameters.selector) {
      throw new Error('Selector is required for selector-based extraction actions');
    }

    // Execute the extraction script
    console.log('Debug: About to execute script with:', {
      selector: action.parameters.selector,
      tabId: tab.id,
    });

    let scriptResult;
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selector: string) => {
          return new Promise((resolve, reject) => {
            try {
              const elements = document.querySelectorAll(selector);
              console.log('Debug: Found elements:', {
                count: elements.length,
                selector,
              });
              const results = Array.from(elements).map(element => {
                const text = element.textContent?.trim() || '';
                const html = element.innerHTML.trim();
                const attributes = Array.from(element.attributes).reduce(
                  (acc, attr) => {
                    acc[attr.name] = attr.value;
                    return acc;
                  },
                  {} as Record<string, string>,
                );
                return { text, html, attributes };
              });
              resolve(results);
            } catch (error) {
              console.error('Debug: Error in script execution:', error);
              reject(error);
            }
          });
        },
        // Ensure selector is always a string. This is safe because we check for selector existence earlier
        args: [action.parameters.selector || ''],
      });
      console.log('Debug: Inside Script result:', result);
      // Ensure scriptResult has the correct type structure
      scriptResult = result as { result: Array<{ text: string; html: string; attributes: Record<string, string> }> };
    } catch (error) {
      console.error('Debug: Script execution error:', error);
      throw error;
    }

    // Return extracted data
    return scriptResult;
  }
}
