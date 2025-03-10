export interface Message {
  role: string;
  content: string;
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
    mode?: 'interactive' | 'conversational',
    structuredOutput?: StructuredOutputConfig,
  ): Promise<string>;
}
