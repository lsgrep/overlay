import type { PageContext } from './llm/prompts/types';
import { PromptManager } from './llm/prompt';
import type { LLMConfig, Message, MessageImage } from './llm/types';
// Import from shared package using relative path
import { CompletionData, overlayApi } from '../../../../packages/shared/lib/services/api';
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
      let currentContent = '';
      let isPdf = false;

      if (tab?.id) {
        // Extract page content and check if it's a PDF in a single operation
        const [pageData] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // Check if the page is a PDF
            const isPdfByUrl = window.location.href.toLowerCase().endsWith('.pdf');
            const contentTypeMeta = document.querySelector('meta[content="application/pdf"]');
            const pdfEmbed = document.querySelector('embed[type="application/pdf"]');
            const pdfObject = document.querySelector('object[type="application/pdf"]');
            const contentTypeHeader = document.contentType === 'application/pdf';
            const isPdf = isPdfByUrl || !!contentTypeMeta || !!pdfEmbed || !!pdfObject || contentTypeHeader;

            // Get document content regardless of PDF status
            const content = document.body?.textContent || '';

            return { isPdf, content };
          },
        });

        if (pageData?.result) {
          isPdf = pageData.result.isPdf;
          currentContent = pageData.result.content;

          // For PDFs, add a note that we're analyzing the document
          if (isPdf) {
            currentContent = '[PDF content - Overlay is analyzing this document]';
          }
        }
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
    completion?: CompletionData;
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

      // Get the preferred language from storage (default to provided defaultLanguage if not set)
      const preferredLanguage = (await llmResponseLanguageStorage.get()) || defaultLanguage;

      // Generate prompt using PromptManager with enhanced options
      const promptOptions = {
        goal: input,
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

      console.log('Page context:', pageContext);

      // Generate prompt using PromptManager

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
      let config: LLMConfig;

      // Handle Ollama models separately since they use local API
      if (modelInfo.provider === 'ollama') {
        const API_URL = 'http://localhost:11434/api/chat';
        const llmService = new OllamaService(selectedModel, API_URL);
        try {
          const prompt = PromptManager.generateContext(mode, pageContext, modelInfo, promptOptions);
          console.log('Debug: Generated prompt:', prompt);
          result = await llmService.generateCompletion(chatMessages, prompt, config, pageContext);
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
        // Ensure pageContext has all required properties for the API
        const apiPageContext = {
          url: pageContext.url || '',
          title: pageContext.title || '',
          content: pageContext.content || '',
          isPdf: pageContext.isPdf,
          ...pageContext,
        };
        result = await overlayApi.generateCompletion(modelInfo, typedMessages, promptOptions, apiPageContext, config);
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
          response: result.data?.response || '',
          completion: result.data?.completion,
          model: modelInfo,
          questionId: questionId,
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
