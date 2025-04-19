/**
 * Utility functions for working with LLM models
 */

export type ModelProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama';

/**
 * Determines the model provider based on the model name
 * @param modelName The name of the model
 * @returns The provider of the model
 */
export function getModelProvider(modelName: string): ModelProvider {
  const name = modelName.toLowerCase();

  if (name.startsWith('gpt') || name.includes('text-') || name.startsWith('dall-e')) {
    return 'openai';
  }

  if (name.startsWith('claude')) {
    return 'anthropic';
  }

  if (name.includes('gemini')) {
    return 'gemini';
  }

  // Default to ollama for any other models
  return 'ollama';
}

/**
 * Creates a ModelInfo object from a model name
 * @param modelName The name of the model
 * @returns A ModelInfo object with name, provider, and displayName
 */
export function createModelInfo(modelName: string) {
  const provider = getModelProvider(modelName);

  // Generate a display name by converting from "model-name-v1" to "Model Name V1"
  const displayName = modelName
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    name: modelName,
    provider,
    displayName,
  };
}
