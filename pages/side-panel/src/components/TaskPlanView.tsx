import React from 'react';
import { performSearch } from '../utils/search';

export interface Step {
  description: string;
  action: 'click' | 'type' | 'navigate' | 'wait' | 'extract' | 'search';
  target?: string;
  value?: string;
  selector?: string;
  query?: string;
}

export interface TaskPlan {
  goal: string;
  steps: Step[];
  estimated_time: string;
}

interface TaskPlanViewProps {
  plan: TaskPlan;
  isLight: boolean;
}

export const TaskPlanView: React.FC<TaskPlanViewProps> = ({ plan, isLight }) => {
  const handleStepAction = async (step: Step) => {
    switch (step.action) {
      case 'search':
        if (step.query) {
          await performSearch(step.query);
        }
        break;
      // Add other action handlers here
    }
  };
  return (
    <div className={`rounded-lg p-4 ${isLight ? 'bg-white' : 'bg-gray-900'}`}>
      <h3 className={`text-lg font-medium mb-3 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{plan.goal}</h3>
      <div className="space-y-3">
        {plan.steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-start space-x-3 p-3 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">
              {i + 1}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{step.description}</p>
              <div className={`flex items-center justify-between mt-1`}>
                <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  Action: {step.action}
                  {step.query && <span className="ml-2">Query: {step.query}</span>}
                  {step.target && <span className="ml-2">Target: {step.target}</span>}
                  {step.value && <span className="ml-2">Value: {step.value}</span>}
                </span>
                <button
                  onClick={() => handleStepAction(step)}
                  className={`px-2 py-1 text-xs rounded ${isLight ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'} hover:opacity-90`}>
                  Execute
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={`mt-3 text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
        Estimated time: {plan.estimated_time}
      </div>
    </div>
  );
};
