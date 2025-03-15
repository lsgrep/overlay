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
  static async extractPdfAsBytes(tabUrl: string): Promise<{ data: Uint8Array | null; filename: string }> {
    try {
      // Get the current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        throw new Error('No active tab found');
      }

      // Parse URL to get filename
      const url = new URL(tabUrl);
      const pathSegments = url.pathname.split('/');
      const filename = pathSegments[pathSegments.length - 1] || 'download.pdf';

      // Fetch the PDF file using fetch API
      const [fetchResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async url => {
          try {
            const response = await fetch(url);

            if (!response.ok) {
              throw new Error(`Failed to fetch PDF: ${response.status}`);
            }

            // Get the PDF as ArrayBuffer
            const arrayBuffer = await response.arrayBuffer();

            // Convert ArrayBuffer to Base64 (for passing between contexts)
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';
            const len = uint8Array.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }

            return {
              base64Data: btoa(binary),
              byteLength: arrayBuffer.byteLength,
            };
          } catch (error) {
            console.error('Error fetching PDF:', error);
            return null;
          }
        },
        args: [tabUrl],
      });

      // If fetch was successful, convert base64 back to Uint8Array
      if (fetchResult?.result) {
        const { base64Data, byteLength } = fetchResult.result;

        // Convert Base64 back to Uint8Array
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(byteLength);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        return {
          data: bytes,
          filename,
        };
      }

      // If the direct fetch didn't work, try using XMLHttpRequest
      // This can sometimes work better with certain PDFs
      const [xhrResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async url => {
          return new Promise(resolve => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';

            xhr.onload = function () {
              if (this.status === 200) {
                // Convert ArrayBuffer to Base64
                const arrayBuffer = this.response;
                const uint8Array = new Uint8Array(arrayBuffer);
                let binary = '';
                const len = uint8Array.byteLength;
                for (let i = 0; i < len; i++) {
                  binary += String.fromCharCode(uint8Array[i]);
                }

                resolve({
                  base64Data: btoa(binary),
                  byteLength: arrayBuffer.byteLength,
                });
              } else {
                resolve(null);
              }
            };

            xhr.onerror = function () {
              resolve(null);
            };

            xhr.send();
          });
        },
        args: [tabUrl],
      });

      // Handle XMLHttpRequest result
      if (xhrResult?.result) {
        const { base64Data, byteLength } = xhrResult.result;

        // Convert Base64 back to Uint8Array
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(byteLength);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        return {
          data: bytes,
          filename,
        };
      }

      // If the PDF is already loaded in Chrome's PDF viewer, try to get it from there
      const [viewerResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (window.PDFViewerApplication && window.PDFViewerApplication.pdfDocument) {
            // Try to access the raw data from the PDF viewer
            // This is a bit of a hack and might not work in all versions of Chrome
            const pdfDocument = window.PDFViewerApplication.pdfDocument;

            if (pdfDocument._transport && pdfDocument._transport._data) {
              const data = pdfDocument._transport._data;

              // If data is already a Uint8Array
              if (data instanceof Uint8Array) {
                // Convert to base64
                let binary = '';
                const len = data.byteLength;
                for (let i = 0; i < len; i++) {
                  binary += String.fromCharCode(data[i]);
                }

                return {
                  base64Data: btoa(binary),
                  byteLength: data.byteLength,
                };
              }
            }
          }

          return null;
        },
      });

      // Handle result from PDF viewer
      if (viewerResult?.result) {
        const { base64Data, byteLength } = viewerResult.result;

        // Convert Base64 back to Uint8Array
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(byteLength);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        return {
          data: bytes,
          filename,
        };
      }

      return { data: null, filename };
    } catch (error) {
      console.error('Failed to extract PDF as bytes:', error);
      return { data: null, filename: 'error.pdf' };
    }
  }

  static async extractPageContent(): Promise<PageContext & { isPdf?: boolean }> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let currentContent = '';
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

      // If this is a PDF, try to get the binary data as well
      let pdfData;
      if (isPdf && tab?.url) {
        const pdfBytes = await ChatService.extractPdfAsBytes(tab.url);
        if (pdfBytes.data) {
          pdfData = {
            bytes: pdfBytes.data,
            filename: pdfBytes.filename,
          };
        }
      }

      const ctx = {
        title: tab?.title,
        url: tab?.url,
        content: currentContent,
        isPdf,
        pdfData,
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
          // If this appears to be a task planning request, use the specialized method
          if (mode === 'interactive' && pageContext) {
            try {
              // Safely access page context properties with defaults
              const safePageContext = {
                title: pageContext?.title || 'Unknown Page',
                url: pageContext?.url || window.location?.href || 'Unknown URL',
                content: pageContext?.content?.substring(0) || '', // Limit content length
              };

              console.log('about to generate task plan:', input, safePageContext);

              // Use the task planning functionality
              const taskPlan = await geminiService.generateTaskPlan(input, safePageContext);

              // Format the response for the chat interface
              response = taskPlan;
              console.log('Generated task plan:', taskPlan);
            } catch (planError) {
              console.error('Task planning failed, falling back to standard completion:', planError);
              // Fall back to standard completion if task planning fails
              response = await geminiService.generateCompletion(chatMessages, prompt, undefined);
            }
          } else {
            // Use standard completion for regular queries
            response = await geminiService.generateCompletion(chatMessages, prompt, undefined);
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
          response = await llmService.generateCompletion(chatMessages, prompt, undefined);
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

    // Add final return statement to ensure all code paths return a value
    return {
      response: 'Could not generate a response. Please try again.',
      model: {
        name: selectedModel,
        provider: selectedModel.startsWith('gpt')
          ? 'openai'
          : selectedModel.startsWith('claude')
            ? 'anthropic'
            : selectedModel.includes('gemini')
              ? 'gemini'
              : 'ollama',
        displayName: selectedModel,
      },
      questionId,
    };
  }
}
