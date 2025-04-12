// Enhanced task types for improved interactive mode

import { SchemaType } from '@google/generative-ai';

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

export const TaskPlanSchema = {
  type: SchemaType.OBJECT,
  description: 'A plan for automating a task on a webpage',
  properties: {
    task_type: {
      type: SchemaType.STRING,
      description: 'The type or category of task to be performed',
    },
    actions: {
      type: SchemaType.ARRAY,
      description: 'List of actions to execute to accomplish the task',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: {
            type: SchemaType.STRING,
            description: 'Unique identifier for the action',
          },
          type: {
            type: SchemaType.STRING,
            description: 'The type of action to perform (e.g., click_element, type, wait)',
            enum: [
              'navigate_to',
              'click_element',
              'extract_data',
              'wait',
              'search',
              'type',
              'extract_data_llm',
              'submit_form',
              'take_screenshot',
              'scroll',
              'hover',
              'press_key',
              'execute_script',
              'evaluate_condition',
              'download_file',
              'set_viewport',
              'handle_dialog',
            ],
          },
          parameters: {
            type: SchemaType.OBJECT,
            description: 'Parameters specific to the action type',
            properties: {
              url: {
                type: SchemaType.STRING,
                description: 'URL for navigation',
              },
              selector: {
                type: SchemaType.STRING,
                description: 'CSS or XPath selector for the target element',
              },
              text: {
                type: SchemaType.STRING,
                description: 'Text to type or content to validate',
              },
              timeout: {
                type: SchemaType.NUMBER,
                description: 'Time to wait in milliseconds',
              },
            },
          },
          description: {
            type: SchemaType.STRING,
            description: 'Human-readable description of what this action does',
          },
          dependsOn: {
            type: SchemaType.ARRAY,
            description: 'IDs of actions this action depends on',
            items: {
              type: SchemaType.STRING,
            },
          },
          parallel: {
            type: SchemaType.BOOLEAN,
            description: 'Whether this action can be executed in parallel',
          },
        },
        required: ['id', 'type', 'parameters', 'description'],
      },
    },
    error_handling: {
      type: SchemaType.OBJECT,
      description: 'How to handle errors that occur during task execution',
      properties: {
        retry_strategy: {
          type: SchemaType.STRING,
          description: 'Strategy for retrying failed actions',
          enum: ['none', 'linear', 'exponential'],
        },
        max_retries: {
          type: SchemaType.NUMBER,
          description: 'Maximum number of retry attempts',
        },
        delay: {
          type: SchemaType.NUMBER,
          description: 'Delay between retries in milliseconds',
        },
        onError: {
          type: SchemaType.OBJECT,
          description: 'What to do when an error occurs',
          properties: {
            action: {
              type: SchemaType.STRING,
              description: 'Action to take when an error occurs',
              enum: ['continue', 'abort', 'retry', 'fallback'],
            },
            message: {
              type: SchemaType.STRING,
              description: 'Error message to display',
            },
          },
        },
      },
      required: ['retry_strategy', 'max_retries'],
    },
    metadata: {
      type: SchemaType.OBJECT,
      description: 'Additional information about the task',
      properties: {
        estimated_time: {
          type: SchemaType.STRING,
          description: 'Estimated time to complete the task',
        },
        complexity: {
          type: SchemaType.STRING,
          description: 'Complexity level of the task',
          enum: ['simple', 'medium', 'complex'],
        },
        success_criteria: {
          type: SchemaType.STRING,
          description: 'Criteria to determine if the task was successful',
        },
        user_confirmation_required: {
          type: SchemaType.BOOLEAN,
          description: 'Whether user confirmation is required before executing',
        },
      },
    },
    explanation: {
      type: SchemaType.STRING,
      description: 'Explanation of the overall task plan',
    },
    version: {
      type: SchemaType.STRING,
      description: 'Version of the task plan schema',
    },
  },
  required: ['task_type', 'actions', 'error_handling'],
};
