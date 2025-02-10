import type React from 'react';
import { useState } from 'react';
import { performSearch } from '../utils/search';
import { navigateTo } from '../utils/navigation';

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
  const [executing, setExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  const handleStepAction = async (step: Step) => {
    switch (step.action) {
      case 'search':
        if (step.query) {
          await performSearch(step.query);
        }
        break;
      case 'navigate':
        if (step.target) {
          await navigateTo(step.target);
        }
        break;
      // Add other action handlers here
    }
  };

  const executeAllSteps = async () => {
    setExecuting(true);
    try {
      for (let i = 0; i < plan.steps.length; i++) {
        setCurrentStep(i);
        await handleStepAction(plan.steps[i]);
        // Add a small delay between steps
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Error executing steps:', error);
    } finally {
      setExecuting(false);
      setCurrentStep(null);
    }
  };
  return (
    <div className={`rounded-lg p-4 ${isLight ? 'bg-white' : 'bg-gray-900'}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className={`text-lg font-medium ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>{plan.goal}</h3>
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
        {plan.steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-start space-x-3 p-3 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-gray-800'}
              ${currentStep === i ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">
              {i + 1}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{step.description}</p>
              <div className="mt-1">
                <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  Action: {step.action}
                  {step.query && <span className="ml-2">Query: {step.query}</span>}
                  {step.target && <span className="ml-2">Target: {step.target}</span>}
                  {step.value && <span className="ml-2">Value: {step.value}</span>}
                </span>
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
