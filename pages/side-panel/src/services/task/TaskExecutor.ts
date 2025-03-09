import { navigateTo } from '../../utils/navigation';
import { performSearch } from '../../utils/search';
import { AnthropicPromptGenerator } from '../llm/prompts';
import type { PageContext } from '../llm/prompts/types';
import type { LLMService } from '../llm/types';

export interface ActionParameters {
  url?: string;
  selector?: string;
  query?: string;
  duration?: number;
  condition?: string;
  value?: string;
  // Properties for LLM extraction tasks
  extractionGoal?: string;
  pageContent?: string;
}

export interface Action {
  id: string;
  type: // Basic actions
  | 'navigate_to'
    | 'click_element'
    | 'extract_data'
    | 'wait'
    | 'search'
    | 'type'
    // Advanced actions
    | 'extract_data_llm'
    | 'submit_form'
    | 'take_screenshot'
    | 'scroll'
    | 'hover'
    | 'execute_script';
  parameters: ActionParameters;
  validation?: {
    required?: string[];
    format?: Record<string, string>;
    constraints?: Record<string, string | number | boolean | RegExp | null | undefined>;
  };
  description: string;
  dependsOn?: string[]; // IDs of actions this action depends on
}

export interface ErrorHandling {
  retry_strategy: 'none' | 'linear' | 'exponential';
  max_retries: number;
  fallback?: {
    type: string;
    parameters: ActionParameters;
  };
}

export interface TaskPlan {
  task_type: string;
  actions: Action[];
  error_handling: ErrorHandling;
  metadata?: {
    estimated_time?: string;
    complexity?: 'simple' | 'medium' | 'complex';
    success_criteria?: string;
    user_confirmation_required?: boolean;
  };
  explanation?: string;
  version?: string;
}

export type ActionStatus = 'pending' | 'loading' | 'complete' | 'error' | 'skipped' | 'canceled';

export interface ExecutionState {
  currentStep: number | null;
  executing: boolean;
  error: string | null;
  actionStatuses: Record<string, ActionStatus>;
  retryCount: Record<string, number>;
  extractedData: Record<
    string,
    Array<{
      text: string;
      html: string;
      attributes: Record<string, string>;
    }>
  >;
  results?: Record<string, unknown>; // Store action results for later use
  progress?: number; // Progress indicator (0-100)
  startTime?: number; // When execution started
  elapsedTime?: number; // Time elapsed since execution started
  executionGraph?: {
    // Represent dependency relationships
    nodes: string[]; // Action IDs
    edges: [string, string][]; // [from, to] pairs
  };
}

export class TaskExecutor {
  private state: ExecutionState = {
    currentStep: null,
    executing: false,
    error: null,
    actionStatuses: {},
    retryCount: {},
    extractedData: {},
  };

  private initializeState() {
    console.log('Initializing TaskExecutor state');
    this.state = {
      currentStep: null,
      executing: false,
      error: null,
      actionStatuses: {},
      retryCount: {},
      extractedData: {},
      results: {},
      progress: 0,
      startTime: 0,
      elapsedTime: 0,
      executionGraph: { nodes: [], edges: [] },
    };
    console.log('Initial state:', this.state);
  }

  private listeners: ((state: ExecutionState) => void)[] = [];

  private pageContext?: PageContext;
  private llmService?: LLMService;
  private goal?: string;

  constructor(pageContext?: PageContext, llmService?: LLMService, goal?: string) {
    this.initializeState();
    if (pageContext) {
      this.pageContext = pageContext;
      console.log('TaskExecutor initialized with page context:', pageContext);
    }
    if (llmService) {
      this.llmService = llmService;
      console.log('TaskExecutor initialized with LLM service');
    }
    if (goal) {
      this.goal = goal;
      console.log('TaskExecutor initialized with goal:', goal);
    }
  }

  private resetState() {
    this.initializeState();
    this.notifyListeners();
  }

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
    // Update state with extracted data
    return scriptResult;
  }

  private setState(updates: Partial<ExecutionState>) {
    const newState = { ...this.state, ...updates };
    console.log('TaskExecutor setState:', {
      current: this.state,
      updates,
      newState,
    });
    this.state = newState;
    this.notifyListeners();
  }

  private notifyListeners() {
    console.log('TaskExecutor notifying listeners with state:', this.state);
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  public subscribe(listener: (state: ExecutionState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Handle LLM-based data extraction
   */
  private async handleLLMExtraction(
    action: Action,
    ctx?: PageContext,
  ): Promise<Array<{ text: string; html: string; attributes: Record<string, string> }>> {
    console.log('Debug: Starting LLM extraction with action:', action);

    if (!this.llmService) {
      throw new Error('LLM service not available for extraction');
    }

    // Determine the question/goal for extraction
    const extractionGoal =
      action.parameters.extractionGoal ||
      action.description ||
      this.goal ||
      'Extract the main information from this page';

    // Get the content to extract from
    const contentToExtract = action.parameters.pageContent || ctx?.content || this.pageContext?.content || '';

    if (!contentToExtract) {
      throw new Error('No content available for LLM extraction');
    }

    // Create the extraction prompt
    const promptManager = new AnthropicPromptGenerator();
    const prompt = promptManager.generateExtractionPrompt(contentToExtract, extractionGoal);

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

  private async handleStepAction(action: Action, pageContext?: PageContext): Promise<boolean> {
    try {
      this.setState({
        actionStatuses: { ...this.state.actionStatuses, [action.id]: 'loading' },
      });

      // Track start time for timing metrics
      const startTime = Date.now();

      // Get the current page context
      const ctx = pageContext || this.pageContext;
      console.log('Debug: About to execute action:', { action, ctx });
      switch (action.type) {
        case 'search':
          if (action.parameters.query) {
            await performSearch(action.parameters.query);
          }
          break;

        case 'navigate_to':
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
                this.setState({
                  actionStatuses: { ...this.state.actionStatuses, [action.id]: 'complete' },
                });
                console.log('Navigation action completed successfully');
              }
            } catch (error) {
              console.error('Navigation error:', error instanceof Error ? error.message : String(error));
              this.setState({
                error: error instanceof Error ? error.message : String(error),
                actionStatuses: { ...this.state.actionStatuses, [action.id]: 'error' },
              });
              throw error;
            }
          }
          break;

        case 'wait':
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
          break;

        case 'click_element':
          if (action.parameters.selector && ctx) {
            // TODO: Implement click action using content script
            throw new Error('Click action not implemented yet');
          }
          break;

        // Direct LLM-based extraction
        case 'extract_data_llm': {
          try {
            console.log('Debug: Starting direct LLM extraction');
            const extractedData = await this.handleLLMExtraction(action, ctx);

            // Update state with LLM extraction result
            this.setState({
              actionStatuses: { ...this.state.actionStatuses, [action.id]: 'complete' },
              extractedData: {
                ...this.state.extractedData,
                [action.id]: extractedData,
              },
              results: {
                ...this.state.results,
                [action.id]: extractedData?.[0]?.text || '',
              },
            });

            console.log('LLM extraction completed successfully:', extractedData);
            break;
          } catch (llmError) {
            console.error(
              'Direct LLM extraction failed:',
              llmError instanceof Error ? llmError.message : String(llmError),
            );
            this.setState({
              error: llmError instanceof Error ? llmError.message : String(llmError),
              actionStatuses: { ...this.state.actionStatuses, [action.id]: 'error' },
            });
            throw llmError;
          }
        }

        case 'extract_data': {
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
              const extractedData = await this.handleLLMExtraction(llmFallbackAction, ctx);

              // Update state with LLM extraction result
              this.setState({
                actionStatuses: { ...this.state.actionStatuses, [action.id]: 'complete' },
                extractedData: {
                  ...this.state.extractedData,
                  [action.id]: extractedData,
                },
                results: {
                  ...this.state.results,
                  [action.id]: extractedData?.[0]?.text || '',
                },
              });

              console.log('Fallback LLM extraction completed successfully');
            } else {
              console.log('Debug: Extraction result with selector:', extractionResult);
              // Update state with selector-based extraction result
              this.setState({
                actionStatuses: { ...this.state.actionStatuses, [action.id]: 'complete' },
                extractedData: {
                  ...this.state.extractedData,
                  [action.id]: extractionResult.result,
                },
                results: {
                  ...this.state.results,
                  [action.id]: extractionResult.result.map(item => item.text).join(', '),
                },
              });
            }
            break;
          } catch (error) {
            console.error('Extraction failed:', error);
            this.setState({
              error: error instanceof Error ? error.message : String(error),
              actionStatuses: { ...this.state.actionStatuses, [action.id]: 'error' },
            });
            throw error;
          }
        }

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Calculate execution time and update progress
      const executionTime = Date.now() - startTime;
      console.log(`Action ${action.id} completed in ${executionTime}ms`);

      // For actions that complete without explicitly setting a status, mark as complete
      if (this.state.actionStatuses[action.id] === 'loading') {
        this.setState({
          actionStatuses: { ...this.state.actionStatuses, [action.id]: 'complete' },
        });
      }

      return true;
    } catch (error) {
      this.setState({
        error: error instanceof Error ? error.message : String(error),
        actionStatuses: { ...this.state.actionStatuses, [action.id]: 'error' },
      });
      return false;
    }
  }

  private async handleRetry(action: Action, plan: TaskPlan): Promise<boolean> {
    const currentRetries = this.state.retryCount[action.id] || 0;
    if (currentRetries >= plan.error_handling.max_retries) {
      if (plan.error_handling.fallback) {
        // Execute fallback action
        const fallbackAction: Action = {
          id: `${action.id}_fallback`,
          type: plan.error_handling.fallback.type as Action['type'],
          parameters: plan.error_handling.fallback.parameters,
          description: `Fallback for: ${action.description}`,
        };
        return this.handleStepAction(fallbackAction);
      }
      return false;
    }

    // Calculate delay based on retry strategy
    const delay = plan.error_handling.retry_strategy === 'exponential' ? Math.pow(2, currentRetries) * 1000 : 1000; // Linear strategy uses fixed delay

    await new Promise(resolve => setTimeout(resolve, delay));
    this.setState({
      retryCount: { ...this.state.retryCount, [action.id]: currentRetries + 1 },
    });
    return this.handleStepAction(action);
  }

  public setPageContext(pageContext: PageContext) {
    this.pageContext = pageContext;
  }

  public getPageContext(): PageContext | undefined {
    return this.pageContext;
  }

  public async executeTask(plan: TaskPlan, pageContext?: PageContext) {
    if (pageContext) {
      this.pageContext = pageContext;
    }
    this.resetState();
    this.setState({ executing: true });

    try {
      for (let i = 0; i < plan.actions.length; i++) {
        this.setState({ currentStep: i });
        const action = plan.actions[i];
        const success = await this.handleStepAction(action);

        if (!success && plan.error_handling.retry_strategy !== 'none') {
          const retrySuccess = await this.handleRetry(action, plan);
          if (!retrySuccess) {
            throw new Error(`Failed to execute ${action.description} after retries`);
          }
        } else if (!success) {
          throw new Error(`Failed to execute ${action.description}`);
        }

        // Add a small delay between steps
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      this.setState({ error: error instanceof Error ? error.message : String(error) });
      console.error('Error executing steps:', error);
    } finally {
      this.setState({ executing: false, currentStep: null });
    }
  }

  public getState(): ExecutionState {
    return this.state;
  }
}
