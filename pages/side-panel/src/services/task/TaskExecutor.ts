import { navigateTo } from '../../utils/navigation';
import { performSearch } from '../../utils/search';
import type { PageContext } from '../llm/prompts/types';

export interface ActionParameters {
  url?: string;
  selector?: string;
  query?: string;
  duration?: number;
  condition?: string;
  value?: string;
}

export interface ActionValidation {
  required: string[];
  format?: Record<string, string>;
  constraints?: Record<string, any>;
}

export interface Action {
  id: string;
  type: 'navigate_to' | 'click_element' | 'extract_data' | 'wait' | 'search' | 'type';
  parameters: ActionParameters;
  validation: ActionValidation;
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

  constructor(pageContext?: PageContext) {
    this.initializeState();
    if (pageContext) {
      this.pageContext = pageContext;
      console.log('TaskExecutor initialized with page context:', pageContext);
    }
  }

  private resetState() {
    this.initializeState();
    this.notifyListeners();
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

  private validateAction(action: Action): boolean {
    try {
      console.log('Debug: Validating action:', {
        type: action.type,
        parameters: action.parameters,
        validation: action.validation,
      });

      // Check required parameters
      for (const required of action.validation.required) {
        if (!action.parameters[required as keyof ActionParameters]) {
          const error = `Missing required parameter: ${required}`;
          console.log('Debug: Validation failed:', error);
          throw new Error(error);
        }
      }

      // Check format constraints
      if (action.validation.format) {
        for (const [field, pattern] of Object.entries(action.validation.format)) {
          const value = action.parameters[field as keyof ActionParameters];
          if (value && !new RegExp(pattern).test(value.toString())) {
            const error = `Invalid format for ${field}: ${value}`;
            console.log('Debug: Validation failed:', error);
            throw new Error(error);
          }
        }
      }

      // Additional validation for extract_data
      if (action.type === 'extract_data') {
        if (!action.parameters.selector) {
          const error = 'Selector is required for extract_data action';
          console.log('Debug: Validation failed:', error);
          throw new Error(error);
        }
        console.log('Debug: extract_data validation passed with selector:', action.parameters.selector);
      }

      console.log('Debug: Validation passed');
      return true;
    } catch (error) {
      console.log('Debug: Validation failed with error:', error.message);
      this.setState({ error: error.message });
      return false;
    }
  }

  private async handleStepAction(action: Action, pageContext?: PageContext): Promise<boolean> {
    try {
      if (!this.validateAction(action)) {
        return false;
      }

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
              const tab = await navigateTo(action.parameters.url);
              // Add a small delay after navigation to ensure page is interactive
              await new Promise(resolve => setTimeout(resolve, 3000));
              // Update page context after page is fully loaded
              if (tab.url && tab.title) {
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
              }
            } catch (error) {
              if (error.message === 'Navigation timeout') {
                throw new Error(`Navigation to ${action.parameters.url} timed out`);
              }
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

            this.pageContext = {
              url: tab.url,
              title: tab.title,
              content: '',
              originalHtml: htmlResult?.result,
            };
            console.log('Debug: Created new page context:', this.pageContext);
          }

          if (!action.parameters.selector) {
            throw new Error('Selector is required for extract_data action');
          }

          console.log('Debug: Extracting data with selector:', action.parameters.selector);

          // Execute the extraction script
          console.log('Debug: About to execute script with:', {
            selector: action.parameters.selector,
            tabId: tab.id,
            action,
          });
          let scriptResult;
          try {
            console.log('Debug: Attempting to execute script with:', {
              tabId: tab.id,
              selector: action.parameters.selector,
              world: 'MAIN', // This indicates where the script runs
            });

            // First, check if the selector is valid
            const validateSelector = (selector: string) => {
              try {
                document.querySelector(selector);
                return true;
              } catch (e) {
                return false;
              }
            };

            const [validationResult] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: validateSelector,
              args: [action.parameters.selector],
            });

            if (!validationResult.result) {
              throw new Error(`Invalid selector syntax: ${action.parameters.selector}`);
            }

            const [result] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: selector => {
                try {
                  console.log('Debug: Inside content script with selector:', selector);
                  console.log('Debug: Document ready state:', document.readyState);
                  console.log('Debug: Document URL:', document.URL);

                  const elements = document.querySelectorAll(selector);
                  console.log('Debug: Found elements:', {
                    count: elements.length,
                    selector: selector,
                    documentElementCount: document.getElementsByTagName('*').length,
                  });

                  if (elements.length === 0) {
                    return { error: `No elements found matching selector: ${selector}` };
                  }

                  // Extract text content from all matching elements
                  const results = Array.from(elements).map(el => {
                    const data = {
                      text: el.textContent?.trim() || '',
                      html: el.innerHTML,
                      attributes: Object.fromEntries(Array.from(el.attributes).map(attr => [attr.name, attr.value])),
                      tagName: el.tagName.toLowerCase(),
                    };
                    console.log('Debug: Extracted element data:', data);
                    return data;
                  });

                  return { results };
                } catch (error) {
                  console.error('Debug: Error in content script:', error);
                  return { error: `Error in content script: ${error.message}` };
                }
              },
              args: [action.parameters.selector],
            });

            console.log('Debug: Script execution result:', result);
            scriptResult = result;
          } catch (error) {
            console.error('Debug: Script execution failed:', error);
            throw error;
          }

          if (!scriptResult?.result) {
            throw new Error('Failed to execute extraction script');
          }

          const extractionResult = result.result as {
            error?: string;
            results?: Array<{ text: string; html: string; attributes: Record<string, string> }>;
          };

          if (extractionResult.error) {
            throw new Error(extractionResult.error);
          }

          // Store the extracted data in the state
          console.log('Extraction successful:', {
            actionId: action.id,
            results: extractionResult.results,
          });

          this.setState({
            extractedData: {
              ...this.state.extractedData,
              [action.id]: extractionResult.results,
            },
          });

          console.log('Updated state:', this.state);
          break;
        }

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      this.setState({
        actionStatuses: { ...this.state.actionStatuses, [action.id]: 'complete' },
      });
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
          validation: { required: [] }, // Simplified validation for fallback
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
