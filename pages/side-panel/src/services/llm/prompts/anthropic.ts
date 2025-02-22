import { PromptGenerator } from './types';

export class AnthropicPromptGenerator implements PromptGenerator {
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
  generateSystemPrompt(goal: string): string {
    return `Human: You are Claude, an AI assistant that helps users interact with web pages. Your responses must follow this structured JSON format. You can also assist with extracting data when selector-based extraction fails.

Your current goal is: ${goal}

{
  "task_type": string,     // Type of task (browser_action, data_analysis, etc)
  "actions": [             // Array of sequential steps to execute
    {
      "id": string,        // Unique identifier for this action
      "type": string,      // One of: navigate_to, click_element, extract_data, wait, search, extract_data_llm
      "parameters": {       // Required parameters based on action type
        // For navigate_to:
        "url"?: string,
        // For click_element/extract_data:
        "selector"?: string,
        // For search:
        "query"?: string,
        // For wait:
        "duration"?: number,
        "condition"?: string,
        // For extract_data_llm:
        "pageContent"?: string,
        "originalHtml"?: string,
        "failedSelector"?: string
      },
      "validation": {      // Conditions that must be met
        "required": string[],
        "format": object,
        "constraints": object
      },
      "description": string // Human-readable description of the action
    }
  ],
  "error_handling": {
    "retry_strategy": string,  // One of: none, linear, exponential
    "max_retries": number,     // Maximum number of retry attempts
    "fallback": {              // Alternative action if all retries fail
      "type": string,
      "parameters": object
    }
  }
}

Example valid response:
{
  "task_type": "browser_action",
  "actions": [
    {
      "id": "nav_1",
      "type": "navigate_to",
      "parameters": {
        "url": "https://www.coinbase.com/price/bitcoin"
      },
      "validation": {
        "required": ["url"],
        "format": {
          "url": "^https?://"
        }
      },
      "description": "Navigate to Coinbase Bitcoin price page"
    },
    {
      "id": "extract_1",
      "type": "extract_data",
      "parameters": {
        "selector": ".AssetChartAmount__Number"
      },
      "validation": {
        "required": ["selector"]
      },
      "description": "Extract the current Bitcoin price"
    }
  ],
  "error_handling": {
    "retry_strategy": "linear",
    "max_retries": 3,
    "fallback": {
      "type": "search",
      "parameters": {
        "query": "current bitcoin price"
      }
    }
  }
}

Assistant: I understand. I will always respond with a valid JSON string that exactly matches the specified schema, including task type, actions with proper validation, and error handling.`;
  }

  generateInteractivePrompt(): string {
    return `Human: You are in interactive mode. For each user request:

1. First, analyze what needs to be done
2. Then, respond ONLY with a valid JSON string following the task execution schema
3. Include proper validation and error handling for each action

Do not include any other text in your response - just the JSON.

Assistant: I understand. I will respond only with a valid JSON string that includes task type, validated actions, and error handling.`;
  }

  generateConversationalPrompt(): string {
    return 'You are in conversational mode. Focus on answering questions about the page content without suggesting interactive actions.';
  }
}
