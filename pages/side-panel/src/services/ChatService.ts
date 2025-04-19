import type { PageContext } from './llm/prompts/types';
import { PromptManager } from './llm/prompt';
import type { Message, MessageImage } from './llm/types';
// Import from shared package using relative path
import { overlayApi } from '../../../../packages/shared/lib/services/api';
import { llmResponseLanguageStorage } from '@extension/storage';
import { OllamaService } from './llm/ollama';
import { createModelInfo } from '../../../../packages/shared/lib/utils/model-utils';

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
  images?: MessageImage[];
  openaiModels?: ModelInfo[];
  geminiModels?: ModelInfo[];
  anthropicModels?: ModelInfo[];
  ollamaModels?: ModelInfo[];
  defaultLanguage?: string;
}

// API_URL is no longer needed since we're using the shared API

export class ChatService {
  static async extractPageContent(): Promise<PageContext & { isPdf?: boolean }> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentContent = '';
      let isPdf = false;

      if (tab?.id) {
        // First check if the page is a PDF
        const [isPdfResult] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // Check URL for PDF extension
            const isPdfByUrl = window.location.href.toLowerCase().endsWith('.pdf');

            // Check content type in meta tags
            const contentTypeMeta = document.querySelector('meta[content="application/pdf"]');

            // Check if the embed or object tag with PDF type exists
            const pdfEmbed = document.querySelector('embed[type="application/pdf"]');
            const pdfObject = document.querySelector('object[type="application/pdf"]');

            // Check document content type if available
            const contentTypeHeader = document.contentType === 'application/pdf';

            return isPdfByUrl || !!contentTypeMeta || !!pdfEmbed || !!pdfObject || contentTypeHeader;
          },
        });

        isPdf = isPdfResult?.result || false;
      }

      const ctx = {
        title: tab?.title,
        url: tab?.url,
        content: currentContent,
        isPdf,
      };
      console.log('chat service page ctx: ');
      console.log(ctx);
      return ctx;
    } catch (error) {
      console.error('Failed to extract page content:', error);
      return {
        title: '',
        url: '',
        content: '',
        isPdf: false,
      };
    }
  }

  static async submitMessage({
    input,
    selectedModel,
    mode,
    pageContext,
    messages,
    images = [],
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

    // Create a question ID for tracking
    const questionId = Date.now().toString();

    try {
      // Get current model info from model lists or create a new one
      const modelInfo =
        [...openaiModels, ...geminiModels, ...anthropicModels, ...ollamaModels].find(
          model => model.name === selectedModel,
        ) || createModelInfo(selectedModel);

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

      // Get the preferred language from storage (default to provided defaultLanguage if not set)
      const preferredLanguage = (await llmResponseLanguageStorage.get()) || defaultLanguage;

      // Generate prompt using PromptManager with enhanced options
      const promptOptions = {
        goal: input,
        actionContext,
        truncateContent: true,
        includeMetadata: true,
        maxContentLength: 10000,
        enhancedMode: true,
        preferredLanguage,
      };

      // Ensure we have page context
      if (pageContext == null || pageContext.content == null) {
        pageContext = await ChatService.extractPageContent();
      }

      // Generate prompt using PromptManager
      const prompt = PromptManager.generateContext(mode, pageContext, modelInfo, promptOptions);
      console.log('Debug: Generated prompt:', prompt);

      // Create user message with content
      const userMessage: Message = {
        role: 'user',
        content: input,
      };

      // Add images to the message if available and using a provider that supports images
      if (images.length > 0 && (modelInfo.provider === 'gemini' || modelInfo.provider === 'anthropic')) {
        console.log(`Adding ${images.length} images to ${modelInfo.provider} message`);
        userMessage.images = images;
      } else if (images.length > 0) {
        console.log(
          `Images provided but model ${modelInfo.provider} doesn't support them. Only Gemini and Anthropic support images.`,
        );
      }

      const chatMessages = messages.concat(userMessage);

      // Format messages to ensure they match the expected API format
      const typedMessages = chatMessages.map(msg => ({
        role:
          msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system'
            ? (msg.role as 'user' | 'assistant' | 'system')
            : 'user',
        content: msg.content,
        images: msg.images,
      }));

      // Log the parameters being sent to the API
      console.log('Calling API with parameters:', {
        input,
        selectedModel,
        messages: chatMessages,
        pageContext,
        images,
        mode,
      });

      // Generate completion based on model provider
      let result;

      // Handle Ollama models separately since they use local API
      if (modelInfo.provider === 'ollama') {
        const API_URL = 'http://localhost:11434/api/chat';
        const llmService = new OllamaService(selectedModel, API_URL);

        try {
          result = await llmService.generateCompletion(chatMessages, prompt, undefined);
        } catch (ollamaError) {
          console.error('Ollama service error:', ollamaError);
          return {
            response: 'Error communicating with Ollama. Please ensure the Ollama service is running and try again.',
            model: modelInfo,
            questionId,
          };
        }
      } else {
        // Use cloud models via API
        result = await overlayApi.generateCompletion(prompt, selectedModel, {
          mode: mode as 'interactive' | 'conversational',
          pageContext: {
            url: pageContext.url || '',
            title: pageContext.title || '',
            content: pageContext.content || '',
          },
          messages: typedMessages,
          images,
          defaultLanguage: preferredLanguage,
        });
      }

      console.log('API response:', result);

      // Process result which could be either an object or a string
      if (typeof result === 'string') {
        // Handle case where result is a direct string response
        return {
          response: result,
          model: modelInfo,
          questionId: questionId,
        };
      } else {
        // Handle case where result is an object with properties
        return {
          response: result.response,
          model: result.model || modelInfo,
          questionId: result.questionId || questionId,
        };
      }
    } catch (error) {
      console.error('Error generating completion through API:', error);

      // Find the model in the available models or create a fallback
      const model =
        [...openaiModels, ...geminiModels, ...anthropicModels, ...ollamaModels].find(
          model => model.name === selectedModel,
        ) || createModelInfo(selectedModel);

      // Return an error message with the model info
      return {
        response:
          error instanceof Error ? error.message : 'An error occurred while generating a response. Please try again.',
        model,
        questionId,
      };
    }
  }
}
