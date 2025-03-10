import type { ActionContext, PromptGenerator } from './types';
import type { TaskPlan } from '../../task/TaskExecutor';

/**
 * Enhanced Anthropic prompt generator with improved interactive mode capabilities
 * This generator provides structured prompts for more powerful web task automation
 * and consistent JSON response formatting.
 */
export class EnhancedAnthropicPromptGenerator implements PromptGenerator {
  generateExtractionPrompt(pageContent: string, question: string): string {
    return `Human: You are a data extraction assistant. Your task is to extract specific information from webpage content. You must ONLY respond with a valid JSON object, nothing else. No explanations, no additional text.

Extract the answer to this question: ${question}

From this content:
${pageContent}

Respond with ONLY one of these JSON formats:

For successful extraction:
{
  "answer": "<the extracted answer>",
  "confidence": <number between 0 and 1>
}

For failed extraction:
{
  "error": "<brief error message>"
}

  Assistant: {"answer": "example", "confidence": 0.9}

  Human: Remember to ONLY return valid JSON. No other text. Extract the answer now:

  Assistant:`;
  }

  generateSystemPrompt(goal?: string): string {
    return `Human: You are Claude, an AI assistant that helps users interact with web pages. Your responses must follow this structured JSON format. You can also assist with extracting data and automating complex web tasks.

Your current goal is: ${goal || 'Help the user interact with web pages effectively'}

{
  "task_type": string,     // Type of task (browser_action, data_analysis, form_filling, content_extraction, etc)
  "actions": [             // Array of sequential steps to execute
    {
      "id": string,        // Unique identifier for this action
      "type": string,      // One of: navigate_to, click_element, extract_data, wait, search, extract_data_llm, type_text, submit_form, take_screenshot, scroll, hover
      "parameters": {      // Required parameters based on action type
        // For navigate_to:
        "url"?: string,
        // For click_element/extract_data:
        "selector"?: string,
        "xpath"?: string,
        // For search:
        "query"?: string,
        // For wait:
        "duration"?: number,
        "condition"?: string,
        "waitForSelector"?: string,
        // For type_text:
        "text"?: string,
        // For form operations:
        "formSelector"?: string,
        "formData"?: object
      },
      "validation": {      // Conditions that must be met
        "required": string[],
        "format": object,
        "constraints": object,
        "custom"?: string  // Custom validation logic
      },
      "description": string, // Human-readable description of the action
      "dependsOn"?: string[] // IDs of actions this action depends on
    }
  ],
  "error_handling": {
    "retry_strategy": string,  // One of: none, linear, exponential
    "max_retries": number,     // Maximum number of retry attempts
    "delay"?: number,          // Delay between retries in ms
    "fallback"?: {             // Alternative action if all retries fail
      "type": string,
      "parameters": object
    },
    "onError"?: {
      "action": string,        // One of: continue, abort, retry, fallback
      "message"?: string       // Message to show the user
    }
  },
  "metadata"?: {
    "estimated_time"?: string,
    "complexity"?: string,
    "success_criteria"?: string,
    "requires_permissions"?: boolean
  },
  "explanation"?: string     // Optional explanation of the plan for user understanding
}

  Assistant: I understand. I will always respond with a valid JSON string that exactly matches the specified schema, including task type, actions with proper validation, and error handling.`;
  }

  generateInteractivePrompt(actionContext?: ActionContext): string {
    const availableTools = actionContext?.availableTools
      ? `\nAvailable tools: ${actionContext.availableTools.join(', ')}`
      : '';

    const recentActions = actionContext?.previousActions?.length
      ? `\nRecent actions: ${actionContext.previousActions.join(', ')}`
      : '';

    // Get example task plan
    const examplePlan = JSON.stringify(this.generateTaskPlanExample(), null, 2);

    return `Human: You are in interactive mode. You will help the user automate web tasks through a series of carefully planned actions.

For each user request:${availableTools}${recentActions}

1. First, analyze what needs to be done and break it down into sequenced steps
2. Consider the most efficient path to accomplish the task
3. Include proper validation to ensure each step works correctly
4. Include robust error handling with fallback options
5. Respond ONLY with a valid JSON string following the task execution schema

Your JSON response MUST include ALL of these properties:
- task_type: A descriptive task type (e.g. "browser_action", "data_extraction")
- actions: Array of sequential steps with id, type, parameters, validation, and description
- error_handling: With retry_strategy, max_retries, and fallback options
- metadata: Including estimated_time, complexity, and success_criteria
- explanation: A brief explanation of what the plan does

Here is an example of the expected format:

${examplePlan}

IMPORTANT: Do not include any other text in your response - ONLY the JSON object that follows the schema shown above. Make sure all required properties are included.

  Assistant: I understand. I will respond only with a valid JSON string that includes task type, validated actions, and error handling.`;
  }

  generateConversationalPrompt(): string {
    return `Human: You are in conversational mode. Focus on answering questions about the page content or providing general assistance. You can analyze the page content and provide insights, but you should not suggest interactive actions unless explicitly asked.

IMPORTANT: In this conversational mode, do NOT return JSON. Respond with natural language in plain text and markdown formatting when appropriate. Do not structure your response as a JSON object.

  Assistant: I understand. I'm in conversational mode now and will respond naturally with helpful information about the page content. I won't return JSON.`;
  }

  generateWebNavigationPrompt(context: { url: string; title: string }): string {
    return `Human: You are a web navigation assistant. Help the user navigate to their desired destination from the current page.

Current page: ${context.title} (${context.url})

Provide a plan for navigating to the user's requested destination with clear, sequential steps. Consider different navigation paths and suggest the most efficient route.`;
  }

  generateTaskDecompositionPrompt(goal: string): string {
    return `Human: Break down this high-level goal into specific, actionable steps:

GOAL: ${goal}

Analyze what information and actions are needed to accomplish this goal. Consider:
1. What information needs to be gathered first?
2. What sequence of actions will efficiently achieve the goal?
3. What potential obstacles might arise?
4. What fallback approaches could work if the primary approach fails?

Respond with a detailed, well-structured task plan.`;
  }

  generateDataExtractionPrompt(context: { url: string; title: string }, schema: any): string {
    return `Human: Extract structured data from the current page (${context.title}) according to this schema:

${JSON.stringify(schema, null, 2)}

Analyze the page content carefully to identify and extract the requested information. If you cannot find specific fields, indicate that with null values or appropriate error messages.`;
  }

  /**
   * Helper method to generate a sample task plan for the interactive mode
   * Helps models understand the expected format
   */
  private generateTaskPlanExample(): TaskPlan {
    return {
      task_type: 'browser_action',
      actions: [
        {
          id: 'nav_1',
          type: 'navigate_to',
          parameters: {
            url: 'https://example.com/search',
          },
          validation: {
            required: ['url'],
            format: {
              url: '^https?://',
            },
          },
          description: 'Navigate to the search page',
        },
        {
          id: 'type_1',
          type: 'type',
          parameters: {
            selector: '#search-input',
            value: 'example search term',
          },
          validation: {
            required: ['selector', 'value'],
          },
          description: 'Type search query in the search box',
        },
        {
          id: 'click_1',
          type: 'click_element',
          parameters: {
            selector: '.search-button',
          },
          validation: {
            required: ['selector'],
          },
          description: 'Click the search button',
        },
        {
          id: 'extract_1',
          type: 'extract_data',
          parameters: {
            selector: '.search-results .item',
          },
          validation: {
            required: ['selector'],
          },
          description: 'Extract search results using CSS selector',
        },
        {
          id: 'extract_llm_1',
          type: 'extract_data_llm',
          parameters: {
            extractionGoal: 'Extract the current Bitcoin price from this page',
          },
          validation: {
            required: ['extractionGoal'],
          },
          description: 'Extract Bitcoin price using LLM if selectors fail',
        },
      ],
      error_handling: {
        retry_strategy: 'linear',
        max_retries: 3,
        delay: 1000,
        fallback: {
          type: 'extract_data_llm',
          parameters: {
            pageContent: 'page content will be injected here',
          },
        },
      },
      metadata: {
        estimated_time: '30 seconds',
        complexity: 'medium',
        success_criteria: 'Successfully extracted search results',
      },
      explanation:
        'This plan will navigate to the search page, enter a search term, click the search button, and extract the results. If selector-based extraction fails, it will fall back to LLM-based extraction.',
    };
  }
}
