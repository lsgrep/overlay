import type { PageContext } from '../llm/prompts/types';
import type { LLMService } from '../llm/types';
import { ExecutionStateManager } from './ExecutionStateManager';
import { LLMExtractionHandler } from './LLMExtractionHandler';
import { ActionHandler } from './ActionHandler';
import type { TaskPlan, ExecutionState } from './types';

/**
 * TaskExecutor orchestrates the execution of task plans by delegating
 * responsibilities to specialized handlers.
 */
export class TaskExecutor {
  private stateManager: ExecutionStateManager;
  private llmExtractionHandler: LLMExtractionHandler;
  private actionHandler: ActionHandler;
  private goal?: string;

  /**
   * Creates a new TaskExecutor instance
   */
  constructor(pageContext?: PageContext, llmService?: LLMService, goal?: string) {
    this.stateManager = new ExecutionStateManager();
    this.stateManager.initializeState();

    if (!llmService) {
      console.warn('TaskExecutor initialized without LLM service, LLM-based tasks may fail');
    }

    this.llmExtractionHandler = new LLMExtractionHandler(llmService as LLMService, pageContext, goal);
    this.actionHandler = new ActionHandler(this.stateManager, this.llmExtractionHandler, pageContext);

    if (pageContext) {
      console.log('TaskExecutor initialized with page context:', pageContext);
    }

    if (goal) {
      this.goal = goal;
      console.log('TaskExecutor initialized with goal:', goal);
    }
  }

  /**
   * Set the page context
   */
  public setPageContext(pageContext: PageContext): void {
    this.llmExtractionHandler.setPageContext(pageContext);
    this.actionHandler.setPageContext(pageContext);
  }

  /**
   * Get the current page context
   */
  public getPageContext(): PageContext | undefined {
    return this.actionHandler.getPageContext();
  }

  /**
   * Execute a task plan
   */
  public async executeTask(plan: TaskPlan, pageContext?: PageContext): Promise<void> {
    if (pageContext) {
      this.setPageContext(pageContext);
    }

    this.stateManager.resetState();
    this.stateManager.setState({ executing: true, startTime: Date.now() });

    try {
      for (let i = 0; i < plan.actions.length; i++) {
        this.stateManager.setState({
          currentStep: i,
          progress: Math.floor((i / plan.actions.length) * 100),
        });

        const action = plan.actions[i];
        const success = await this.actionHandler.handleAction(action);

        if (!success && plan.error_handling.retry_strategy !== 'none') {
          const retrySuccess = await this.actionHandler.handleRetry(action, plan);
          if (!retrySuccess) {
            throw new Error(`Failed to execute ${action.description} after retries`);
          }
        } else if (!success) {
          throw new Error(`Failed to execute ${action.description}`);
        }

        // Add a small delay between steps
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Set final progress to 100%
      this.stateManager.setState({
        progress: 100,
        elapsedTime: Date.now() - (this.stateManager.getState().startTime || 0),
        executing: false,
      });

      console.log('Task execution completed successfully');
    } catch (error) {
      console.error('Task execution failed:', error instanceof Error ? error.message : String(error));

      this.stateManager.setState({
        error: error instanceof Error ? error.message : String(error),
        executing: false,
        elapsedTime: Date.now() - (this.stateManager.getState().startTime || 0),
      });

      throw error;
    }
  }

  /**
   * Get the current execution state
   */
  public getState(): ExecutionState {
    return this.stateManager.getState();
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  public subscribe(listener: (state: ExecutionState) => void): () => void {
    return this.stateManager.subscribe(listener);
  }
}
