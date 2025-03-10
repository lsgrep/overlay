import { geminiKeyStorage } from '@extension/storage';
import type { JSONSchema, LLMConfig, LLMService, Message, StructuredOutputConfig } from './types';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, type CoreMessage } from 'ai';

/**
 * Action types available for task planning
 */
export enum TaskActionType {
  NAVIGATE_TO = 'navigate_to',
  CLICK_ELEMENT = 'click_element',
  EXTRACT_DATA = 'extract_data',
  WAIT = 'wait',
  SEARCH = 'search',
  TYPE = 'type',
  EXTRACT_DATA_LLM = 'extract_data_llm',
  SUBMIT_FORM = 'submit_form',
  SCROLL = 'scroll',
  HOVER = 'hover',
  PRESS_KEY = 'press_key',
}

/**
 * Retry strategy for task actions
 */
export enum RetryStrategy {
  NONE = 'none',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
}

/**
 * Task complexity levels
 */
export enum TaskComplexity {
  SIMPLE = 'simple',
  MEDIUM = 'medium',
  COMPLEX = 'complex',
}

/**
 * Base parameters for task actions
 */
export interface TaskActionParameters {
  [key: string]: string | number | boolean | Record<string, unknown> | undefined;
}

/**
 * Navigation parameters
 */
export interface NavigateParameters extends TaskActionParameters {
  url: string;
}

/**
 * Element interaction parameters
 */
export interface ElementParameters extends TaskActionParameters {
  selector: string;
}

/**
 * Input parameters
 */
export interface InputParameters extends ElementParameters {
  value: string;
}

/**
 * Wait parameters
 */
export interface WaitParameters extends TaskActionParameters {
  duration: number; // milliseconds
  condition?: string;
}

// Fix for TypeScript index signature error
export interface TaskActionParametersMap {
  [key: string]: string | number | boolean | Record<string, unknown> | undefined;
}

/**
 * Search parameters
 */
export interface SearchParameters extends TaskActionParameters {
  query: string;
}

/**
 * Key press parameters
 */
export interface KeyPressParameters extends TaskActionParameters {
  key: string;
}

/**
 * Action in a task plan
 */
export interface TaskAction {
  id: string;
  type: TaskActionType | string;
  parameters: TaskActionParametersMap;
  description: string;
}

/**
 * Error handling configuration for a task
 */
export interface TaskErrorHandling {
  retry_strategy: RetryStrategy | string;
  max_retries: number;
}

/**
 * Metadata for a task
 */
export interface TaskMetadata {
  estimated_time?: string;
  complexity?: TaskComplexity | string;
  user_confirmation_required?: boolean;
}

/**
 * Complete task plan structure
 */
export interface TaskPlan extends Record<string, unknown> {
  task_type: string;
  actions: TaskAction[];
  error_handling: TaskErrorHandling;
  metadata?: TaskMetadata;
  explanation?: string;
}

/**
 * Options for invoking the Gemini service
 */
export interface GeminiInvocationOptions {
  /** Input messages for the conversation */
  messages: Message[];
  /** System context or instructions */
  context: string;
  /** LLM configuration parameters */
  config?: LLMConfig;
  /** Mode of operation - interactive or conversational */
  mode?: 'interactive' | 'conversational';
  /** Configuration for structured output */
  structuredOutput?: StructuredOutputConfig;
}

/**
 * Implementation of LLMService for Google's Gemini models
 */
export class GeminiService implements LLMService {
  private modelName: string;

  constructor(modelName: string) {
    // Remove any model/ prefix if present, the SDK will handle the format
    this.modelName = modelName.replace(/^models\//, '');
  }

  async generateCompletion(
    messages: Message[],
    context: string,
    config?: LLMConfig,
    mode: 'interactive' | 'conversational' = 'conversational',
    structuredOutput?: StructuredOutputConfig,
  ): Promise<string> {
    // Adjust temperature based on the mode
    const temperatureAdjustment = mode === 'interactive' ? 0.2 : 0.0;
    const adjustedTemperature = (config?.temperature ?? 0.7) - temperatureAdjustment;

    // Get API key from storage
    const geminiKey = await geminiKeyStorage.get();
    if (!geminiKey) {
      throw new Error('Gemini API key not found');
    }

    try {
      // Create Google Generative AI provider with API key
      const google = createGoogleGenerativeAI({
        apiKey: geminiKey,
      });

      // Create the model instance with appropriate configuration
      const model = google(this.modelName, {
        // Disable structured outputs when using complex schema that might have unions
        // or other unsupported features
        structuredOutputs: structuredOutput?.disableNativeStructuredOutput ? false : true,
      });

      // Prepare messages format - convert from our format to AI SDK format
      const aiMessages: CoreMessage[] = [];

      // For Gemini, prepend the system context to the first user message
      // or add as a user message if there are no user messages
      const hasUserMessage = messages.some(msg => msg.role === 'user');
      if (!hasUserMessage) {
        // If no user messages, add context as a user message
        aiMessages.push({
          role: 'user',
          content: `${context}\n\nPlease acknowledge that you understand these instructions.`,
        } as CoreMessage);
      }

      // Add the conversation messages
      for (const idx in messages) {
        const msg = messages[idx];
        // Map our role format to the AI SDK format
        // The SDK expects 'user', 'assistant', 'system', or 'tool'
        let sdkRole: 'user' | 'assistant' | 'system' | 'tool';

        switch (msg.role) {
          case 'user':
            sdkRole = 'user';
            break;
          case 'assistant':
            sdkRole = 'assistant';
            break;
          case 'system':
            sdkRole = 'system';
            break;
          default:
            sdkRole = 'user'; // Default fallback
        }

        // For the first user message, prepend the system context
        if (sdkRole === 'user' && idx === '0' && context) {
          aiMessages.push({
            role: sdkRole,
            content: `${context}\n\n${msg.content}`,
          } as CoreMessage);
        } else {
          aiMessages.push({
            role: sdkRole,
            content: msg.content,
          } as CoreMessage);
        }
      }

      // Generate completion using AI SDK
      const completion = await generateText({
        model,
        messages: aiMessages,
        temperature: adjustedTemperature,
        maxTokens: config?.maxOutputTokens ?? 2048,
        topP: config?.topP ?? 0.95,
        topK: config?.topK ?? 40,
      });

      // Process the text response - convert completion result to string
      // The SDK returns a special result object that needs to be converted to string
      console.log('Gemini response:', completion);

      // Handle structured output
      if (structuredOutput?.schema) {
        try {
          // If we're returning structured output directly from Gemini API
          if (!structuredOutput.disableNativeStructuredOutput) {
            return completion.text;
          }

          // If we need to post-process the text to extract JSON
          const text = completion.text;
          // Try to parse directly first
          try {
            const parsed = JSON.parse(text);
            return JSON.stringify(parsed);
          } catch (parseError) {
            console.warn('Failed to parse direct JSON response, attempting extraction:', parseError);

            // Try to extract JSON from markdown code blocks or plain text
            const jsonMatch =
              text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
              text.match(/\s*({[\s\S]*})\s*/) ||
              text.match(/\s*(\[[\s\S]*\])\s*/) ||
              text.match(/{[\s\S]*}/) ||
              text.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
              let extractedJson = jsonMatch[1] || jsonMatch[0];
              extractedJson = extractedJson.replace(/,\s*(\}|\])(?=\s*$)/g, '$1').trim();

              try {
                const parsed = JSON.parse(extractedJson);
                return JSON.stringify(parsed);
              } catch (extractionError) {
                console.error('Failed to extract JSON from response:', extractionError);
                return JSON.stringify({
                  error: 'Failed to parse structured output',
                  original_response: text,
                });
              }
            } else {
              console.warn('No JSON pattern found in response');
              return JSON.stringify({
                error: 'No JSON pattern found in model response',
                original_response: text,
              });
            }
          }
        } catch (error) {
          console.error('Error handling structured output:', error);
          return JSON.stringify({
            error: 'Error processing structured output',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // For interactive mode, format response appropriately
      if (mode === 'interactive') {
        try {
          // Try to parse as JSON first
          const parsed = JSON.parse(completion.text);

          // If already has answer field, return as is
          if (parsed.answer) {
            return JSON.stringify(parsed);
          }

          // Otherwise wrap in expected format
          return JSON.stringify({
            answer: typeof parsed === 'object' ? JSON.stringify(parsed) : parsed,
            confidence: 0.9,
          });
        } catch {
          // Not JSON, wrap the plain text
          return JSON.stringify({
            answer: completion.text,
            confidence: 0.7,
          });
        }
      }

      // Default case, return raw text
      return completion.text;
    } catch (error) {
      console.error('Error in Gemini chat:', error);
      // Provide more detailed error information
      if (error instanceof Error) {
        throw new Error(`Gemini API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Helper method for creating structured output configurations
   * @param schema JSON schema for the structured output
   * @param disableNative Whether to disable native structured output (needed for complex schemas)
   */
  static createStructuredOutputConfig(schema: JSONSchema, disableNative = false): StructuredOutputConfig {
    return {
      schema,
      disableNativeStructuredOutput: disableNative,
    };
  }

  /**
   * Create the schema for task planning
   * @returns JSONSchema for task planning
   */
  static createTaskPlanningSchema(): JSONSchema {
    return {
      type: 'OBJECT',
      properties: {
        task_type: {
          type: 'STRING',
          description: 'Short descriptive name of the task (e.g., "Search Form Submission", "Data Extraction")',
        },
        actions: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              id: {
                type: 'STRING',
                description: 'Unique identifier like "step1", "search_action", etc.',
              },
              type: {
                type: 'STRING',
                description: 'Action type: navigate_to, click_element, extract_data, wait, search, type, etc.',
              },
              parameters: {
                type: 'OBJECT',
                description: 'Parameters specific to the action type',
              },
              description: {
                type: 'STRING',
                description: 'Human-readable description of what this action does',
              },
            },
            required: ['id', 'type', 'description'],
          },
        },
        error_handling: {
          type: 'OBJECT',
          properties: {
            retry_strategy: {
              type: 'STRING',
              description: 'One of: "none", "linear", "exponential"',
            },
            max_retries: {
              type: 'INTEGER',
              description: 'Maximum retry attempts (typically 3)',
            },
          },
          required: ['retry_strategy', 'max_retries'],
        },
        metadata: {
          type: 'OBJECT',
          properties: {
            estimated_time: {
              type: 'STRING',
              description: 'Estimated time to complete the task, e.g., "30 seconds"',
            },
            complexity: {
              type: 'STRING',
              description: 'One of: "simple", "medium", "complex"',
            },
            user_confirmation_required: {
              type: 'BOOLEAN',
              description: 'True if user needs to confirm before execution',
            },
          },
        },
        explanation: {
          type: 'STRING',
          description: 'Optional explanation of the overall task',
        },
      },
      required: ['task_type', 'actions', 'error_handling'],
    };
  }

  /**
   * Simplified method to invoke Gemini with structured output
   * @param options Configuration options for the invocation
   */
  async generateStructuredOutput<T extends Record<string, unknown>>(options: GeminiInvocationOptions): Promise<T> {
    const { messages, context, config, mode = 'interactive', structuredOutput } = options;

    // Ensure we have a structured output config with disableNativeStructuredOutput set appropriately
    const outputConfig = structuredOutput || {
      schema: {
        type: 'OBJECT',
        properties: {},
      },
      disableNativeStructuredOutput: true,
    };

    const result = await this.generateCompletion(messages, context, config, mode, outputConfig);

    // Parse the result to get the structured output
    try {
      return JSON.parse(result) as T;
    } catch (error) {
      console.error('Failed to parse structured output:', error);
      throw new Error('Failed to parse Gemini structured output: ' + String(error));
    }
  }

  /**
   * Generate a task plan for web automation using interactive mode
   * @param userRequest User's task request
   * @param pageContext Current page information (title, URL, content)
   * @param availableTools Optional list of available tools
   * @param previousActions Optional list of previous actions
   * @returns A complete task plan
   */
  async generateTaskPlan(
    userRequest: string,
    pageContext: {
      title?: string;
      url?: string;
      content?: string;
    },
    availableTools: string[] = [],
    previousActions: string[] = [],
  ): Promise<TaskPlan> {
    // We have availableTools and previousActions available for constructing the context

    // Prepare system context
    let systemContext = `You are Gemini, an AI assistant specialized in creating structured automation plans for web page interactions.

Your task is to analyze user requests and generate executable task plans formatted as JSON.

Current page information:
Title: ${pageContext.title || 'Unknown'}
URL: ${pageContext.url || 'Unknown'}
`;

    if (pageContext.content) {
      // Include a truncated version of the page content for context
      const maxContentLength = 1500;
      const content =
        pageContext.content.length > maxContentLength
          ? pageContext.content.substring(0, maxContentLength) + '... (content truncated)'
          : pageContext.content;
      systemContext += `\n\nPage content:\n${content}`;
    }

    // Add tools information
    systemContext += '\n\nAvailable action types and their required parameters:';
    systemContext += `\n- ${TaskActionType.NAVIGATE_TO}: url (required)`;
    systemContext += `\n- ${TaskActionType.CLICK_ELEMENT}: selector (required)`;
    systemContext += `\n- ${TaskActionType.EXTRACT_DATA}: selector (required)`;
    systemContext += `\n- ${TaskActionType.WAIT}: duration (in ms) or condition`;
    systemContext += `\n- ${TaskActionType.SEARCH}: query (required)`;
    systemContext += `\n- ${TaskActionType.TYPE}: selector (required), value (required)`;
    systemContext += `\n- ${TaskActionType.EXTRACT_DATA_LLM}: pageContent or failedSelector`;
    systemContext += `\n- ${TaskActionType.SUBMIT_FORM}: formSelector (required)`;
    systemContext += `\n- ${TaskActionType.SCROLL}: position (optional)`;
    systemContext += `\n- ${TaskActionType.HOVER}: selector (required)`;
    systemContext += `\n- ${TaskActionType.PRESS_KEY}: key (required)`;

    if (availableTools.length > 0) {
      systemContext += `\n\nAvailable tools: ${availableTools.join(', ')}`;
    }

    if (previousActions.length > 0) {
      systemContext += `\n\nRecent actions: ${previousActions.slice(-3).join(', ')}`;
    }

    // Prepare the message with the user's request
    const messages: Message[] = [{ role: 'user', content: userRequest }];

    // Configure model parameters for interactive mode
    const config: LLMConfig = {
      temperature: 0.2, // Lower temperature for more deterministic results
      maxOutputTokens: 2048, // Allow sufficient space for complex plans
      topP: 0.95,
      topK: 40,
    };

    // Create structured output config with the task planning schema
    const structuredOutputConfig = GeminiService.createStructuredOutputConfig(
      GeminiService.createTaskPlanningSchema(),
      true, // Disable native structured output due to schema complexity
    );

    // Generate the task plan
    console.log('Generating task plan for:', userRequest);
    console.log('Current page:', pageContext.title, pageContext.url);

    try {
      // Use the generateStructuredOutput helper to get the typed result
      const taskPlan = await this.generateStructuredOutput<TaskPlan>({
        messages,
        context: systemContext,
        config,
        mode: 'interactive',
        structuredOutput: structuredOutputConfig,
      });

      console.log('Task plan generated successfully:', taskPlan);
      return taskPlan;
    } catch (error) {
      console.error('Failed to generate task plan:', error);
      throw new Error('Failed to generate task plan: ' + String(error));
    }
  }

  /**
   * Example usage method that demonstrates the end-to-end process
   * This is a convenience method to show how to use the task planning functionality
   * @param userRequest The user's request in natural language
   * @param pageTitle The current page title
   * @param pageUrl The current page URL
   * @param pageContent Optional page content
   * @returns The generated task plan
   */
  static async generatePlanExample(
    userRequest: string,
    pageTitle: string,
    pageUrl: string,
    pageContent?: string,
  ): Promise<TaskPlan> {
    try {
      // Step 1: Check if API key exists
      const apiKey = await geminiKeyStorage.get();
      if (!apiKey) {
        throw new Error('Gemini API key not found. Please set your API key first.');
      }

      // Step 2: Create the Gemini service instance
      const geminiService = new GeminiService('gemini-1.5-pro-latest');

      // Step 3: Prepare the page context
      const pageContext = {
        title: pageTitle,
        url: pageUrl,
        content: pageContent,
      };

      // Step 4: Generate the task plan
      const taskPlan = await geminiService.generateTaskPlan(
        userRequest,
        pageContext,
        ['click', 'search', 'extract'], // Example available tools
      );

      // Step 5: Process and return the plan
      return taskPlan;
    } catch (error) {
      console.error('Error in end-to-end task plan generation:', error);
      throw error;
    }
  }
}
