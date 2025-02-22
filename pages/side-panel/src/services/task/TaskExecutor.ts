import { navigateTo } from '../../utils/navigation';
import { performSearch } from '../../utils/search';

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
}

export class TaskExecutor {
  private state: ExecutionState = {
    currentStep: null,
    executing: false,
    error: null,
    actionStatuses: {},
    retryCount: {},
  };

  private listeners: ((state: ExecutionState) => void)[] = [];

  constructor() {
    this.resetState();
  }

  private resetState() {
    this.state = {
      currentStep: null,
      executing: false,
      error: null,
      actionStatuses: {},
      retryCount: {},
    };
    this.notifyListeners();
  }

  private setState(updates: Partial<ExecutionState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  public subscribe(listener: (state: ExecutionState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private validateAction(action: Action): boolean {
    try {
      // Check required parameters
      for (const required of action.validation.required) {
        if (!action.parameters[required as keyof ActionParameters]) {
          throw new Error(`Missing required parameter: ${required}`);
        }
      }

      // Check format constraints
      if (action.validation.format) {
        for (const [field, pattern] of Object.entries(action.validation.format)) {
          const value = action.parameters[field as keyof ActionParameters];
          if (value && !new RegExp(pattern).test(value.toString())) {
            throw new Error(`Invalid format for ${field}: ${value}`);
          }
        }
      }

      return true;
    } catch (error) {
      this.setState({ error: error.message });
      return false;
    }
  }

  private async handleStepAction(action: Action): Promise<boolean> {
    try {
      if (!this.validateAction(action)) {
        return false;
      }

      this.setState({
        actionStatuses: { ...this.state.actionStatuses, [action.id]: 'loading' },
      });

      switch (action.type) {
        case 'search':
          if (action.parameters.query) {
            await performSearch(action.parameters.query);
          }
          break;

        case 'navigate_to':
          if (action.parameters.url) {
            try {
              await navigateTo(action.parameters.url);
              // Add a small delay after navigation to ensure page is interactive
              await new Promise(resolve => setTimeout(resolve, 1000));
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
          if (action.parameters.selector) {
            // TODO: Implement click action using content script
            throw new Error('Click action not implemented yet');
          }
          break;

        case 'extract_data':
          if (action.parameters.selector) {
            // TODO: Implement data extraction using content script
            throw new Error('Data extraction not implemented yet');
          }
          break;

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

  public async executeTask(plan: TaskPlan) {
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
