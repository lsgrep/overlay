import type { PageContext } from './llm/prompts/types';
import { PromptManager } from './llm/prompt';
import { AnthropicService } from './llm/anthropic';
import { GeminiService } from './llm/gemini';
import { OpenAIService } from './llm/openai';
import { OllamaService } from './llm/ollama';
import type { LLMService } from './llm/types';

interface Message {
  role: string;
  content: string;
  model?: {
    name: string;
    displayName?: string;
    provider: string;
  };
  metadata?: {
    questionId?: string;
    originalQuestion?: string;
    extractedData?: Record<string, unknown>;
    timestamp?: number;
  };
}

interface ModelInfo {
  name: string;
  displayName?: string;
  provider: string;
}

interface ChatOptions {
  input: string;
  selectedModel: string;
  mode: 'interactive' | 'conversational';
  pageContext: PageContext;
  messages: Message[];
  openaiModels?: ModelInfo[];
  geminiModels?: ModelInfo[];
  anthropicModels?: ModelInfo[];
  ollamaModels?: ModelInfo[];
  defaultLanguage?: string;
}

const API_URL = 'http://localhost:11434/api/chat';

export class ChatService {
  static async extractPageContent(): Promise<PageContext> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let currentContent = '';

      if (tab?.id) {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.body.innerText,
        });

        if (result?.result) {
          currentContent = result.result;
        }
      }

      return {
        title: tab?.title,
        url: tab?.url,
        content: currentContent,
      };
    } catch (error) {
      console.error('Failed to extract page content:', error);
      return {
        title: '',
        url: '',
        content: '',
      };
    }
  }

  static async submitMessage({
    input,
    selectedModel,
    mode,
    pageContext,
    messages,
    openaiModels = [],
    geminiModels = [],
    anthropicModels = [],
    ollamaModels = [],
    defaultLanguage = 'en',
  }: ChatOptions): Promise<{
    response: string;
    model: ModelInfo;
    questionId: string;
  }> {
    console.log('Debug: Submitting chat:', { input, selectedModel, mode });
    console.log('current model:', selectedModel);

    // Get current model info
    const modelInfo = [...openaiModels, ...geminiModels, ...anthropicModels, ...ollamaModels].find(
      model => model.name === selectedModel,
    ) || {
      name: selectedModel,
      provider: selectedModel.startsWith('gpt')
        ? 'openai'
        : selectedModel.includes('gemini')
          ? 'gemini'
          : selectedModel.startsWith('claude')
            ? 'anthropic'
            : 'ollama',
      displayName: selectedModel,
    };

    // Create an action context for enhanced interactive mode
    const actionContext = {
      sessionId: Date.now().toString(),
      previousActions: messages
        .filter(msg => msg.role === 'assistant')
        .slice(-3)
        .map(msg => {
          try {
            const json = JSON.parse(msg.content);
            return json.task_type || 'unknown';
          } catch {
            // If parsing fails, assume it's a conversational message
            return 'conversational';
          }
        }),
      availableTools: ['navigation', 'extraction', 'search', 'interaction'],
      userPreferences: {
        language: defaultLanguage,
        autoExecute: true,
      },
    };

    // Generate prompt using PromptManager with enhanced options
    const promptOptions = {
      goal: input,
      actionContext,
      truncateContent: true,
      includeMetadata: true,
      maxContentLength: 10000,
      enhancedMode: true,
    };

    // Generate prompt using PromptManager
    const prompt = PromptManager.generateContext(mode, pageContext, modelInfo, promptOptions);
    console.log('Debug: Generated prompt:', prompt);

    // Prepare messages for the selected model
    const questionId = Date.now().toString();
    const chatMessages = messages.concat({
      role: 'user',
      content: input,
      metadata: {
        questionId,
        timestamp: Date.now(),
      },
    });

    let response: string = '';
    let llmService: LLMService;

    try {
      // Check for extension context validity at the beginning
      if (typeof chrome !== 'undefined' && chrome?.runtime?.lastError) {
        console.error('Chrome runtime error detected at start:', chrome.runtime.lastError);
        throw new Error(`Extension context error: ${chrome.runtime.lastError.message}`);
      }

      if (selectedModel.startsWith('claude')) {
        const anthropicMessages = chatMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));
        llmService = new AnthropicService(selectedModel);
        response = await llmService.generateCompletion(anthropicMessages, prompt);
      } else if (selectedModel.includes('gemini')) {
        const geminiService = new GeminiService(selectedModel);
        const modelName = selectedModel.replace('models/', '');
        const model = {
          name: selectedModel,
          provider: 'gemini',
          displayName: modelName.charAt(0).toUpperCase() + modelName.slice(1),
        };

        try {
          // Check if this is a task planning request
          const isTaskPlanningRequest =
            input.toLowerCase().includes('task plan') ||
            input.toLowerCase().includes('automate') ||
            input.toLowerCase().includes('extract data');

          // If this appears to be a task planning request, use the specialized method
          if (isTaskPlanningRequest && mode === 'interactive' && pageContext) {
            try {
              // Safely access page context properties with defaults
              const safePageContext = {
                title: pageContext?.title || 'Unknown Page',
                url: pageContext?.url || window.location?.href || 'Unknown URL',
                content: pageContext?.content?.substring(0, 2000) || '', // Limit content length
              };

              // Use the task planning functionality
              const taskPlan = await geminiService.generateTaskPlan(
                input,
                safePageContext,
                [], // Available tools - could be extended in the future
                [], // Previous actions - could be tracked in the future
              );

              // Format the response for the chat interface
              response = JSON.stringify(taskPlan, null, 2);
              console.log('Generated task plan:', taskPlan);
            } catch (planError) {
              console.error('Task planning failed, falling back to standard completion:', planError);
              // Fall back to standard completion if task planning fails
              response = await geminiService.generateCompletion(chatMessages, prompt, undefined, mode);
            }
          } else {
            // Use standard completion for regular queries
            response = await geminiService.generateCompletion(chatMessages, prompt, undefined, mode);
          }

          return {
            response,
            model,
            questionId,
          };
        } catch (geminiError) {
          console.error('Error in Gemini processing:', geminiError);
          // Check if this is an extension context error
          // Properly type the error
          const error = geminiError as Error;
          if (error.message?.includes('Extension context')) {
            throw geminiError; // Re-throw to be caught by outer handler
          }
          // Otherwise return a friendly error message
          return {
            response: 'An error occurred while processing your request with Gemini. Please try again.',
            model,
            questionId,
          };
        }
      } else if (selectedModel.startsWith('gpt')) {
        try {
          llmService = new OpenAIService(selectedModel);
          response = await llmService.generateCompletion(chatMessages, prompt);
        } catch (openaiError) {
          console.error('OpenAI service error:', openaiError);
          response = 'Error communicating with OpenAI. Please try again later.';
        }
      } else {
        try {
          llmService = new OllamaService(selectedModel, API_URL);
          response = await llmService.generateCompletion(chatMessages, prompt, undefined, mode);
        } catch (ollamaError) {
          console.error('Ollama service error:', ollamaError);
          response = 'Error communicating with Ollama. Please ensure the Ollama service is running and try again.';
        }
      }
    } catch (globalError) {
      // Global error handler for any unexpected errors
      console.error('Global error in submitMessage:', globalError);
      // Handle error object gracefully
      const error = globalError as Error;
      if (error.message?.includes('Extension context invalidated')) {
        response =
          'The extension context was invalidated. Please reload the extension or refresh the page and try again.';
      } else {
        response = 'I encountered an unexpected error. Please try again or reload the extension.';
      }
    }

    console.log('Debug: Response:', response);

    // If we've already returned from the Gemini branch, we don't need to continue
    if (response) {
      const model = [...openaiModels, ...geminiModels, ...anthropicModels, ...ollamaModels].find(
        model => model.name === selectedModel,
      ) || {
        name: selectedModel,
        provider: selectedModel.startsWith('gpt')
          ? 'openai'
          : selectedModel.startsWith('claude')
            ? 'anthropic'
            : selectedModel.includes('gemini')
              ? 'gemini'
              : 'ollama',
        displayName: selectedModel,
      };

      try {
        // Final check for extension context validity before returning
        if (typeof chrome !== 'undefined' && chrome?.runtime?.lastError) {
          console.error('Chrome runtime error before return:', chrome.runtime.lastError);
          throw new Error(`Extension context error: ${chrome.runtime.lastError.message}`);
        }

        return {
          response,
          model,
          questionId,
        };
      } catch (finalError) {
        console.error('Error in final response preparation:', finalError);
        // If we encounter an extension context error at the end, still return something useful
        return {
          response:
            'The extension context was invalidated. Please reload the extension or refresh the page and try again.',
          model,
          questionId,
        };
      }
    }
  }
}
