interface PageContext {
  title?: string;
  url?: string;
  content: string;
}

export class PromptManager {
  static generateContext(mode: 'interactive' | 'conversational' | 'context-menu', pageContext: PageContext): string {
    const contextParts = [
      pageContext.title && `Current page title: ${pageContext.title}`,
      pageContext.url && `Current URL: ${pageContext.url}`,
      pageContext.content && `Page content: ${pageContext.content.slice(0, 1000)}...`,
    ].filter(Boolean);

    const modeSpecificPrompt =
      mode === 'interactive'
        ? 'Please provide step-by-step instructions for interacting with the webpage.'
        : mode === 'context-menu'
          ? 'Please provide a focused response based on the selected text and context.'
          : 'Please provide a helpful response based on the conversation and context.';

    return `${contextParts.join('\n\n')}\n\n${modeSpecificPrompt}`;
  }
}
