// Enhanced task types for improved interactive mode

export interface ActionParameters {
  // Basic navigation
  url?: string;
  selector?: string;
  query?: string;
  duration?: number;
  condition?: string;
  value?: string;
  text?: string;

  // Advanced parameters
  xpath?: string;
  formSelector?: string;
  attributes?: string[];
  waitForSelector?: string;
  waitForXPath?: string;
  position?: { x: number; y: number };

  // Content extraction
  pageContent?: string;
  originalHtml?: string;
  failedSelector?: string;
  extractionSchema?: Record<string, unknown>;

  // Form handling
  formData?: Record<string, string>;
  submitButton?: string;

  // DOM manipulation
  eventType?: string;
  eventOptions?: Record<string, unknown>;

  // Validation
  validationFn?: string;
  expectedValue?: string;
}

export interface ValidationRule {
  required?: string[];
  format?: Record<string, string>; // Regex patterns for validation
  constraints?: Record<string, unknown>;
  custom?: string; // Custom validation function as string
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
    | 'press_key'
    | 'execute_script'
    | 'evaluate_condition'
    | 'download_file'
    | 'set_viewport'
    | 'handle_dialog';
  parameters: ActionParameters;
  validation?: ValidationRule;
  description: string;
  dependsOn?: string[]; // IDs of actions this action depends on
  parallel?: boolean; // Whether this action can be executed in parallel
}

export interface ErrorHandling {
  retry_strategy: 'none' | 'linear' | 'exponential';
  max_retries: number;
  delay?: number; // Delay between retries in ms
  fallback?: {
    type: string;
    parameters: ActionParameters;
  };
  onError?: {
    action: 'continue' | 'abort' | 'retry' | 'fallback';
    message?: string;
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
}

export interface TaskExecutorOptions {
  autoRetry?: boolean;
  timeoutMs?: number;
  verbose?: boolean;
  headless?: boolean;
  preserveState?: boolean;
}
