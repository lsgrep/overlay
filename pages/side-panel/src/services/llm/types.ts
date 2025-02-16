export interface Message {
  role: string;
  content: string;
}

export interface TaskStep {
  description: string;
  action: 'click' | 'type' | 'navigate' | 'wait' | 'extract';
  target?: string;
  value?: string;
  selector?: string;
}

export interface TaskPlan {
  goal: string;
  steps: TaskStep[];
  estimated_time: string;
}

export interface LLMConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export interface LLMService {
  generateCompletion(messages: Message[], context: string, config?: LLMConfig): Promise<string>;
}
