import type React from 'react';
import { useEffect, useState } from 'react';
import { TaskExecutor } from '../services/task/TaskExecutor';
import type { TaskPlan, ExecutionState } from '../services/task/types';
import type { PageContext } from '../services/llm/prompts/types';
import type { LLMService } from '../services/llm/types';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';

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
    // Safely pass pageContext to TaskExecutor
    const exec = new TaskExecutor(pageContext || undefined, llmService, goal);
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
        // Safely pass pageContext to executor
        executor.executeTask(plan, pageContext || undefined);
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
    <div className="rounded-lg p-4 bg-card">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-lg font-medium text-foreground">{plan.task_type}</h3>
          {state.error && <p className="text-sm text-destructive mt-1">{state.error}</p>}

          {/* Task metadata */}
          <div className="flex flex-wrap gap-2 mt-2">
            {plan.metadata?.complexity && (
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                Complexity: {plan.metadata.complexity}
              </span>
            )}
            {plan.metadata?.estimated_time && (
              <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1 bg-muted text-muted-foreground">
                <ClockIcon className="w-3 h-3" />
                {plan.metadata.estimated_time}
              </span>
            )}
            {plan.metadata?.user_confirmation_required && (
              <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1 text-amber-500 bg-amber-500/10">
                <ExclamationTriangleIcon className="w-3 h-3" />
                Requires confirmation
              </span>
            )}
          </div>
        </div>
        <button
          onClick={executeAllSteps}
          disabled={state.executing}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground
            hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          {state.executing ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>Executing{state.progress ? ` (${state.progress}%)` : '...'}</span>
            </>
          ) : (
            'Execute All Steps'
          )}
        </button>
      </div>

      {/* Plan explanation if available */}
      {plan.explanation && (
        <div className="mb-4 p-3 text-sm rounded-lg bg-primary/10 text-primary-foreground">
          <div className="flex items-start gap-2">
            <InformationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>{plan.explanation}</div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {plan.actions.map((action, i) => (
          <div
            key={action.id}
            className={`flex items-start space-x-3 p-3 rounded-lg bg-muted
              ${state.currentStep === i ? 'ring-2 ring-primary' : ''}
              ${state.retryCount[action.id] ? 'border-l-4 border-yellow-500' : ''}
              ${state.actionStatuses[action.id] === 'loading' ? 'bg-primary/10' : ''}
              ${state.actionStatuses[action.id] === 'complete' ? 'bg-success/10' : ''}
              ${state.actionStatuses[action.id] === 'error' ? 'bg-destructive/10' : ''}`}>
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
              {i + 1}
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">{action.description}</p>
              <div className="mt-1">
                <span className="text-xs text-muted-foreground">
                  Action: {action.type}
                  {action.parameters.query && <span className="ml-2">Query: {action.parameters.query}</span>}
                  {action.parameters.url && <span className="ml-2">URL: {action.parameters.url}</span>}
                  {action.parameters.selector && <span className="ml-2">Selector: {action.parameters.selector}</span>}
                  {action.parameters.value && <span className="ml-2">Value: {action.parameters.value}</span>}
                  {state.actionStatuses[action.id] && (
                    <span
                      className={`ml-2 flex items-center gap-1 ${
                        {
                          loading: 'text-blue-500',
                          complete: 'text-green-500',
                          error: 'text-red-500',
                          pending: 'text-gray-500',
                          skipped: 'text-gray-400',
                          canceled: 'text-amber-500',
                        }[state.actionStatuses[action.id]]
                      }`}>
                      {
                        {
                          loading: (
                            <>
                              <ArrowPathIcon className="w-3 h-3 animate-spin" /> Running...
                            </>
                          ),
                          complete: (
                            <>
                              <CheckCircleIcon className="w-3 h-3" /> Complete
                            </>
                          ),
                          error: (
                            <>
                              <XCircleIcon className="w-3 h-3" /> Failed
                            </>
                          ),
                          pending: (
                            <>
                              <ClockIcon className="w-3 h-3" /> Pending
                            </>
                          ),
                          skipped: (
                            <>
                              <InformationCircleIcon className="w-3 h-3" /> Skipped
                            </>
                          ),
                          canceled: (
                            <>
                              <ExclamationTriangleIcon className="w-3 h-3" /> Canceled
                            </>
                          ),
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
                                  {/* Special highlight for LLM-extracted data */}
                                  {item.attributes.method === 'llm' && (
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs
                                      ${isLight ? 'bg-purple-100 text-purple-800' : 'bg-purple-900 text-purple-200'}`}>
                                      🤖 LLM Extracted
                                    </span>
                                  )}

                                  {/* Display confidence more prominently if available */}
                                  {item.attributes.confidence && (
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs
                                      ${
                                        parseFloat(item.attributes.confidence) > 0.7
                                          ? isLight
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-green-900 text-green-200'
                                          : isLight
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-yellow-900 text-yellow-200'
                                      }`}>
                                      Confidence: {Number(parseFloat(item.attributes.confidence) * 100).toFixed(0)}%
                                    </span>
                                  )}

                                  {/* Display other attributes */}
                                  {Object.entries(item.attributes)
                                    .filter(([key]) => !['method', 'confidence'].includes(key))
                                    .map(([key, value]) => (
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
      <div className="mt-3">
        {/* Progress bar for ongoing executions */}
        {state.executing && state.progress !== undefined && (
          <div className="mb-3">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 ease-in-out rounded-full"
                style={{ width: `${state.progress}%` }}></div>
            </div>
            <div className="mt-1 text-xs text-center text-gray-500">
              {state.elapsedTime ? `Elapsed: ${Math.round(state.elapsedTime / 1000)}s` : ''}
            </div>
          </div>
        )}

        {/* Error handling info */}
        <div className="text-sm text-gray-500 grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">Retry Strategy:</span> {plan.error_handling.retry_strategy}
          </div>
          <div>
            <span className="font-medium">Max Retries:</span> {plan.error_handling.max_retries}
          </div>
          {plan.error_handling.delay && (
            <div>
              <span className="font-medium">Retry Delay:</span> {plan.error_handling.delay}ms
            </div>
          )}
          {plan.error_handling.fallback && (
            <div>
              <span className="font-medium">Fallback:</span> {plan.error_handling.fallback.type}
            </div>
          )}
          {plan.metadata?.success_criteria && (
            <div className="col-span-2">
              <span className="font-medium">Success Criteria:</span> {plan.metadata.success_criteria}
            </div>
          )}
        </div>

        {/* Version info if available */}
        {plan.version && <div className="mt-2 text-xs text-gray-400 text-right">Plan version: {plan.version}</div>}
      </div>
    </div>
  );
};
