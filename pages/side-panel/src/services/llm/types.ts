import type { PageContext } from './prompts';

export interface MessageImage {
  url: string;
  mimeType?: string;
}

export interface Message {
  role: string;
  content: string;
  /**
   * Optional array of image data to include with the message
   * Currently only supported by Gemini
   */
  images?: MessageImage[];
}

export interface LLMConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export type JSONSchemaType = 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';

export interface JSONSchemaProperty {
  type: JSONSchemaType;
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty; // For ARRAY type
  properties?: Record<string, JSONSchemaProperty>; // For OBJECT type
  required?: string[]; // For OBJECT type
}

export interface JSONSchema {
  type: JSONSchemaType;
  description?: string;
  properties?: Record<string, JSONSchemaProperty>; // For OBJECT type
  items?: JSONSchemaProperty; // For ARRAY type
  required?: string[]; // For OBJECT type
}

export interface StructuredOutputConfig {
  schema?: JSONSchema;
  /**
   * If true, disables native structured output capabilities of the model
   * and instead relies on post-processing the text output.
   * This is useful for models like Gemini that have limited schema support.
   */
  disableNativeStructuredOutput?: boolean;
}

export interface LLMService {
  generateCompletion(
    messages: Message[],
    context: string,
    config?: LLMConfig,
    pageContent?: PageContext,
  ): Promise<string>;
}
