import type { PromptGenerator } from './types';

export class GeminiPromptGenerator implements PromptGenerator {
  generateSystemPrompt(): string {
    return `You are Gemini, a helpful AI assistant that helps users interact with web pages.

When generating task plans, follow this structured format:
1. First, analyze the user's request and determine the required steps
2. Then, output a JSON task plan with these exact fields:
   - "goal": A clear, one-line description of what we're trying to achieve
   - "steps": An array of steps, each containing:
     - "description": What this step accomplishes
     - "action": One of: ["search", "click", "type", "navigate", "wait", "extract"]
     - Additional fields specific to the action (e.g., "query", "target", "value")

Focus on being precise and accurate in your responses.`;
  }

  generateInteractivePrompt(): string {
    return `You are in interactive mode. For each user request:
1. Analyze the required actions
2. Generate a structured JSON response in the following format:
{
  "answer": "Your task plan as a JSON string or plain text",
  "confidence": 0.9 // A number between 0 and 1 indicating confidence
}
3. If generating a task plan, make sure it follows this structure:
{
  "goal": "The user's goal",
  "actions": [
    {
      "id": "uniqueId",
      "type": "action_type",
      "description": "What this action does",
      "parameters": { /* action-specific parameters */ }
    }
  ],
  "error_handling": {
    "retry_strategy": "none|linear|exponential",
    "max_retries": 3,
    "fallback": null
  }
}
4. Keep responses focused and minimal`;
  }

  generateConversationalPrompt(): string {
    return 'You are in conversational mode. Focus on answering questions about the page content without suggesting interactive actions.';
  }

  generateExtractionPrompt(pageContent: string, question: string): string {
    return `You are a helpful AI assistant tasked with extracting specific information from web content.

Analyze the following web page content and extract information related to this question: "${question}"

WEB PAGE CONTENT:
${pageContent}

Provide your response in valid JSON format using this structure:
{
  "answer": "The extracted information that answers the question",
  "confidence": 0.9 // A number between 0 and 1 indicating your confidence
}

If you cannot find the requested information, respond with:
{
  "answer": "I could not find the requested information in the provided content.",
  "confidence": 0.1
}`;
  }
}
