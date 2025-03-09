import type { ExecutionState, ActionStatus } from './types';

/**
 * Manages the execution state for the TaskExecutor
 */
export class ExecutionStateManager {
  private state: ExecutionState = {
    currentStep: null,
    executing: false,
    error: null,
    actionStatuses: {},
    retryCount: {},
    extractedData: {},
  };

  private listeners: ((state: ExecutionState) => void)[] = [];

  /**
   * Initialize the execution state
   */
  public initializeState(): void {
    console.log('Initializing ExecutionStateManager state');
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
    };
    console.log('Initial state:', this.state);
  }

  /**
   * Reset the state to initial values
   */
  public resetState(): void {
    this.initializeState();
    this.notifyListeners();
  }

  /**
   * Update the execution state
   */
  public setState(updates: Partial<ExecutionState>): void {
    const newState = { ...this.state, ...updates };
    console.log('ExecutionStateManager setState:', {
      current: this.state,
      updates,
      newState,
    });
    this.state = newState;
    this.notifyListeners();
  }

  /**
   * Get the current execution state
   */
  public getState(): ExecutionState {
    return { ...this.state };
  }

  /**
   * Notify all registered listeners about state changes
   */
  private notifyListeners(): void {
    console.log('ExecutionStateManager notifying listeners with state:', this.state);
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  public subscribe(listener: (state: ExecutionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Update the status of an action
   */
  public updateActionStatus(actionId: string, status: ActionStatus): void {
    this.setState({
      actionStatuses: { ...this.state.actionStatuses, [actionId]: status },
    });
  }

  /**
   * Increment the retry count for an action
   */
  public incrementRetryCount(actionId: string): number {
    const currentRetries = this.state.retryCount[actionId] || 0;
    const newRetryCount = currentRetries + 1;

    this.setState({
      retryCount: { ...this.state.retryCount, [actionId]: newRetryCount },
    });

    return newRetryCount;
  }

  /**
   * Update extracted data for an action
   */
  public updateExtractedData(
    actionId: string,
    data: Array<{ text: string; html: string; attributes: Record<string, string> }>,
  ): void {
    this.setState({
      extractedData: {
        ...this.state.extractedData,
        [actionId]: data,
      },
      results: {
        ...this.state.results,
        [actionId]: data?.length > 0 ? data.map(item => item.text).join(', ') : '',
      },
    });
  }
}
