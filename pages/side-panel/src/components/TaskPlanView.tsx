import type React from 'react';
import { useEffect, useState } from 'react';
import { TaskExecutor, type TaskPlan, type ExecutionState } from '../services/task/TaskExecutor';
import type { PageContext } from '../services/llm/prompts/types';
import type { LLMService } from '../services/llm/types';

interface TaskPlanViewProps {
  plan: TaskPlan;
  isLight: boolean;
  pageContext?: PageContext;
  llmService?: LLMService;
  goal?: string;
}

export const TaskPlanView: React.FC<TaskPlanViewProps> = ({ plan, isLight, pageContext, llmService, goal }) => {
  // Create a TaskExecutor instance
  const [executor] = useState(() => {
    const exec = new TaskExecutor(pageContext, llmService, goal);
    console.log('Initial executor state:', exec.getState());
    return exec;
  });
  const [state, setState] = useState<ExecutionState>(() => {
    const initialState = executor.getState();
    console.log('Setting initial state:', initialState);
    return initialState;
  });
  const [hasExecuted, setHasExecuted] = useState(false);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = executor.subscribe(newState => {
      console.log('TaskPlanView received new state:', newState);
      setState(newState);
    });

    // Auto-execute after 3 seconds if not already executed
    const timer = setTimeout(() => {
      if (!hasExecuted) {
        console.log('Auto-executing task plan');
        executor.executeTask(plan, pageContext);
        setHasExecuted(true);
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [executor, plan, pageContext, hasExecuted]);

  // Update page context when it changes
  useEffect(() => {
    if (pageContext) {
      executor.setPageContext(pageContext);
    }
  }, [executor, pageContext]);

  const executeAllSteps = () => {
    executor.executeTask(plan, pageContext);
  };

  return (
    <div className={`rounded-lg p-4 ${isLight ? 'bg-white' : 'bg-gray-900'}`}>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className={`text-lg font-medium ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{plan.task_type}</h3>
          {state.error && <p className="text-sm text-red-500 mt-1">{state.error}</p>}
        </div>
        <button
          onClick={executeAllSteps}
          disabled={state.executing}
          className={`px-3 py-1.5 rounded-lg ${isLight ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'} 
            hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}>
          {state.executing ? (
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
              ${state.currentStep === i ? 'ring-2 ring-blue-500' : ''}
              ${state.retryCount[action.id] ? 'border-l-4 border-yellow-500' : ''}
              ${state.actionStatuses[action.id] === 'loading' ? 'bg-blue-50' : ''}
              ${state.actionStatuses[action.id] === 'complete' ? 'bg-green-50' : ''}
              ${state.actionStatuses[action.id] === 'error' ? 'bg-red-50' : ''}`}>
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
                  {state.actionStatuses[action.id] && (
                    <span
                      className={`ml-2 ${
                        {
                          loading: 'text-blue-500',
                          complete: 'text-green-500',
                          error: 'text-red-500',
                          pending: 'text-gray-500',
                        }[state.actionStatuses[action.id]]
                      }`}>
                      {
                        {
                          loading: '⏳ Running...',
                          complete: '✓ Complete',
                          error: '✗ Failed',
                          pending: 'Pending',
                        }[state.actionStatuses[action.id]]
                      }
                    </span>
                  )}
                  {state.retryCount[action.id] > 0 && (
                    <span className="ml-2 text-yellow-500">
                      Retries: {state.retryCount[action.id]}/{plan.error_handling.max_retries}
                    </span>
                  )}
                </span>
              </div>

              {/* Show extracted data if available */}
              {action.type === 'extract_data' &&
                (() => {
                  console.log('Checking extracted data for action:', {
                    actionId: action.id,
                    hasExtractedData: !!state.extractedData,
                    extractedData: state.extractedData?.[action.id],
                    status: state.actionStatuses[action.id],
                  });

                  if (
                    state.extractedData &&
                    state.extractedData[action.id] &&
                    state.actionStatuses[action.id] === 'complete'
                  ) {
                    return (
                      <div className={`mt-3 p-3 rounded-lg ${isLight ? 'bg-gray-100' : 'bg-gray-700'}`}>
                        <h4 className={`text-sm font-medium mb-2 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                          Extracted Data ({state.extractedData[action.id].length} items)
                        </h4>
                        <div className="space-y-2">
                          {state.extractedData[action.id].map((item, i) => (
                            <div key={i} className={`p-2 rounded ${isLight ? 'bg-white' : 'bg-gray-800'} text-sm`}>
                              <div className={isLight ? 'text-gray-800' : 'text-gray-200'}>{item.text}</div>
                              {Object.entries(item.attributes).length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {Object.entries(item.attributes).map(([key, value]) => (
                                    <span
                                      key={key}
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs
                                  ${isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-600 text-gray-300'}`}>
                                      {key}="{value}"
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
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
