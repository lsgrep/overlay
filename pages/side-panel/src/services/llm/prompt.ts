export interface PageContext {
  title?: string;
  url?: string;
  content?: string;
}

export class PromptManager {
  static generateContext(mode: 'interactive' | 'conversational' | 'context-menu', pageContext: PageContext): string {
    let context = `
You are an AI assistant that helps users interact with web pages. When appropriate, generate a task plan with specific actions. Use these actions:
- 'search': Perform a Google search (requires query parameter)
- 'click': Click on an element (requires target selector)
- 'type': Type text into a form field (requires target selector and value)
- 'navigate': Navigate to a URL (requires target URL)
- 'wait': Wait for a specific condition or time
- 'extract': Extract information from the page`;

    if (pageContext.title || pageContext.url) {
      context += `\n\nCurrent page: ${pageContext.title || ''} ${pageContext.url ? `(${pageContext.url})` : ''}`;
    }

    if (pageContext.content) {
      context += `\n\nPage content:\n${pageContext.content}`;
    }

    if (mode === 'interactive') {
      context += `\n\nYou are in interactive mode. Generate a task plan with specific steps to help the user achieve their goal.

For any information seeking tasks, use the 'search' action directly with a specific query. For example:
{
  "goal": "Find the current price of gold",
  "steps": [
    {
      "description": "Search for gold price",
      "action": "search",
      "query": "current price of gold per ounce"
    }
  ]
}`;
    } else {
      context += `\n\nYou are in conversational mode. Focus on answering questions about the page content without suggesting interactive actions.`;
    }

    return context;
  }
}
