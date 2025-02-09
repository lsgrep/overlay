import React from 'react';

export interface Step {
  description: string;
  action: string;
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
              <span className={`text-xs mt-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                Action: {step.action}
              </span>
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
