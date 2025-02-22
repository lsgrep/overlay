import { navigateTo } from '../../utils/navigation';
import { performSearch } from '../../utils/search';
import type { PageContext } from '../llm/prompts/types';
import type { LLMService } from '../llm/types';

export interface ActionParameters {
  url?: string;
  selector?: string;
  query?: string;
  duration?: number;
  condition?: string;
  value?: string;
}

export interface Action {
  id: string;
  type: 'navigate_to' | 'click_element' | 'extract_data' | 'wait' | 'search' | 'type';
  parameters: ActionParameters;
  description: string;
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
}

export type ActionStatus = 'pending' | 'loading' | 'complete' | 'error';

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
    };
    console.log('Initial state:', this.state);
  }

  private listeners: ((state: ExecutionState) => void)[] = [];

  private pageContext: PageContext | null = null;
  private llmService: LLMService | null = null;
  private goal: string | null = null;

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

    if (!action.parameters.selector) {
      throw new Error('Selector is required for extract_data action');
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
        func: selector => {
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
        args: [action.parameters.selector],
      });
      console.log('Debug: Inside Script result:', result);
      scriptResult = result;
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

  private async handleStepAction(action: Action, pageContext?: PageContext): Promise<boolean> {
    try {
      this.setState({
        actionStatuses: { ...this.state.actionStatuses, [action.id]: 'loading' },
      });

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
                // Get the original HTML of the page
                const [htmlResult] = await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  func: () => document.documentElement.outerHTML,
                });

                this.pageContext = {
                  url: tab.url,
                  title: tab.title,
                  content: ctx?.content, // Preserve existing content until we can fetch new content
                  originalHtml: htmlResult?.result,
                };
                // Mark navigation as complete
                this.setState({
                  actionStatuses: { ...this.state.actionStatuses, [action.id]: 'complete' },
                });
                console.log('Navigation action completed successfully');
              }
            } catch (error) {
              console.error('Navigation error:', error);
              this.setState({
                error: error.message,
                actionStatuses: { ...this.state.actionStatuses, [action.id]: 'error' },
              });
              throw error;
            }
          }
          break;

        case 'wait':
          if (action.parameters.duration) {
            await new Promise(resolve => setTimeout(resolve, action.parameters.duration! * 1000));
          }
          break;

        case 'click_element':
          if (action.parameters.selector && ctx) {
            // TODO: Implement click action using content script
            throw new Error('Click action not implemented yet');
          }
          break;

        case 'extract_data': {
          const extractionResult = await this.handleExtractData(action, ctx);
          if (!extractionResult || !extractionResult.result || !extractionResult.result.length) {
            console.log('Debug: No extraction result found, attempting LLM extraction');
            console.log('Debug: LLM service:', this.llmService);
            console.log('Debug: Goal:', this.goal);
            // if (!this.llmService || !this.goal) {
            //   throw new Error('LLM service or goal not available for extraction');
            // }
            // TODO: Use LLM service with goal for extraction
            // const llmResult = await this.llmService.chat([{
            //   role: 'user',
            //   content: `Extract data from the page with goal: ${this.goal}`
            // }], 'claude-3', ctx?.content || '');
          }
          console.log('Debug: Extraction result:', extractionResult);
          // if this is null let's use LLM
          this.setState({
            actionStatuses: { ...this.state.actionStatuses, [action.id]: 'complete' },
            extractedData: {
              ...this.state.extractedData,
              [action.id]: extractionResult.result,
            },
          });
          break;
        }

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      return true;
    } catch (error) {
      this.setState({
        error: error.message,
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

  public getPageContext(): PageContext | null {
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
      this.setState({ error: error.message });
      console.error('Error executing steps:', error);
    } finally {
      this.setState({ executing: false, currentStep: null });
    }
  }

  public getState(): ExecutionState {
    return this.state;
  }
}
