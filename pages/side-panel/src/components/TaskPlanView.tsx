import type React from 'react';
import { useState } from 'react';
import { performSearch } from '../utils/search';
import { navigateTo } from '../utils/navigation';

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

interface TaskPlanViewProps {
  plan: TaskPlan;
  isLight: boolean;
}

export const TaskPlanView: React.FC<TaskPlanViewProps> = ({ plan, isLight }) => {
  const [executing, setExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});

  const validateAction = (action: Action): boolean => {
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
      setError(error.message);
      return false;
    }
  };

  const handleStepAction = async (action: Action): Promise<boolean> => {
    try {
      if (!validateAction(action)) {
        return false;
      }

      switch (action.type) {
        case 'search':
          if (action.parameters.query) {
            await performSearch(action.parameters.query);
          }
          break;
        case 'navigate_to':
          if (action.parameters.url) {
            await navigateTo(action.parameters.url);
          }
          break;
        case 'wait':
          if (action.parameters.duration) {
            await new Promise(resolve => setTimeout(resolve, action.parameters.duration! * 1000));
          }
          break;
        // Add other action handlers here
      }
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  const handleRetry = async (action: Action): Promise<boolean> => {
    const currentRetries = retryCount[action.id] || 0;
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
        return handleStepAction(fallbackAction);
      }
      return false;
    }

    // Calculate delay based on retry strategy
    const delay = plan.error_handling.retry_strategy === 'exponential' ? Math.pow(2, currentRetries) * 1000 : 1000; // Linear strategy uses fixed delay

    await new Promise(resolve => setTimeout(resolve, delay));
    setRetryCount(prev => ({ ...prev, [action.id]: currentRetries + 1 }));
    return handleStepAction(action);
  };

  const executeAllSteps = async () => {
    setExecuting(true);
    setError(null);
    setRetryCount({});

    try {
      for (let i = 0; i < plan.actions.length; i++) {
        setCurrentStep(i);
        const action = plan.actions[i];
        const success = await handleStepAction(action);

        if (!success && plan.error_handling.retry_strategy !== 'none') {
          const retrySuccess = await handleRetry(action);
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
      setError(error.message);
      console.error('Error executing steps:', error);
    } finally {
      setExecuting(false);
      setCurrentStep(null);
    }
  };
  return (
    <div className={`rounded-lg p-4 ${isLight ? 'bg-white' : 'bg-gray-900'}`}>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className={`text-lg font-medium ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{plan.task_type}</h3>
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
        <button
          onClick={executeAllSteps}
          disabled={executing}
          className={`px-3 py-1.5 rounded-lg ${isLight ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'} 
            hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}>
          {executing ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              Executing...
            </>
          ) : (
            'Execute All Steps'
          )}
        </button>
      </div>
      <div className="space-y-3">
        {plan.actions.map((action, i) => (
          <div
            key={action.id}
            className={`flex items-start space-x-3 p-3 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-gray-800'}
              ${currentStep === i ? 'ring-2 ring-blue-500' : ''}
              ${retryCount[action.id] ? 'border-l-4 border-yellow-500' : ''}`}>
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">
              {i + 1}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{action.description}</p>
              <div className="mt-1">
                <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  Action: {action.type}
                  {action.parameters.query && <span className="ml-2">Query: {action.parameters.query}</span>}
                  {action.parameters.url && <span className="ml-2">URL: {action.parameters.url}</span>}
                  {action.parameters.selector && <span className="ml-2">Selector: {action.parameters.selector}</span>}
                  {action.parameters.value && <span className="ml-2">Value: {action.parameters.value}</span>}
                  {retryCount[action.id] > 0 && (
                    <span className="ml-2 text-yellow-500">
                      Retries: {retryCount[action.id]}/{plan.error_handling.max_retries}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-sm text-gray-500">
        <div>Retry Strategy: {plan.error_handling.retry_strategy}</div>
        <div>Max Retries: {plan.error_handling.max_retries}</div>
        {plan.error_handling.fallback && <div>Fallback: {plan.error_handling.fallback.type}</div>}
      </div>
    </div>
  );
};
