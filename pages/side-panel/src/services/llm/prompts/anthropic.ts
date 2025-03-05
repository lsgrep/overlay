import { ActionContext, PromptGenerator } from './types';

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
}`;
  }
}
