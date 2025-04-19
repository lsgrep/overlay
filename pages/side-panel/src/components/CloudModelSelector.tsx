import type * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { ModelSelector } from './ModelSelector';
import { overlayApi } from '@extension/shared/lib/services/api'; // Import overlayApi which contains getModels
import { defaultModelStorage } from '@extension/storage';
import { useStorage } from '@extension/shared';
import { ModelService } from '@extension/shared/lib/services/models';

// Define the model info interface
interface ModelInfo {
  name: string;
  displayName?: string;
  provider: string;
}

interface CloudModelSelectorProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  user: {
    id: string;
    email?: string;
    user_metadata?: { avatar_url?: string; full_name?: string; [key: string]: unknown };
  } | null;
}

export const CloudModelSelector: React.FC<CloudModelSelectorProps> = ({ selectedModel, setSelectedModel, user }) => {
  // State for storing models
  const [openaiModels, setOpenaiModels] = useState<ModelInfo[]>([]);
  const [geminiModels, setGeminiModels] = useState<ModelInfo[]>([]);
  const [anthropicModels, setAnthropicModels] = useState<ModelInfo[]>([]);
  const [ollamaModels, setOllamaModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);

  // Get default model from storage
  const defaultModel = useStorage(defaultModelStorage);
  const DEFAULT_MODEL_KEY = 'overlay_default_model';

  // Memoized fetch function to prevent unnecessary rerenders
  const fetchModels = useCallback(async () => {
    try {
      setIsLoadingModels(true);
      setModelError(null);

      console.log('[CloudModelSelector] Fetching models from API using getModels...');
      // Explicitly call the getModels function from overlayApi
      const resp = await overlayApi.getModels();
      const { gemini, openai, anthropic } = resp.data || {};
      console.log('[CloudModelSelector] Fetched models:', { gemini, openai, anthropic });
      const models: ModelInfo[] = [];

      // Sort models alphabetically by displayName within each provider group
      const sortByDisplayName = (a: ModelInfo, b: ModelInfo) => {
        const nameA = a.displayName || a.name;
        const nameB = b.displayName || b.name;
        return nameA.localeCompare(nameB);
      };
      // Categorize models by provider
      if (openai) {
        models.push(...openai);
        setOpenaiModels(openai.sort(sortByDisplayName));
      }
      if (gemini) {
        models.push(...gemini);
        setGeminiModels(gemini.sort(sortByDisplayName));
      }
      if (anthropic) {
        models.push(...anthropic);
        setAnthropicModels(anthropic.sort(sortByDisplayName));
      }

      // Ollama only can be fetched locally
      try {
        const ollamaModels = await ModelService.fetchOllamaModels();
        setOllamaModels(ollamaModels.sort(sortByDisplayName));
      } catch (error) {
        console.error('[CloudModelSelector] Error fetching Ollama models:', error);
        setOllamaModels([]);
      }

      // Set model selection logic
      if (!selectedModel && models?.length > 0) {
        // First try to use the stored default model if it exists in available models
        if (defaultModel && models.some(model => model.name === defaultModel)) {
          console.log(`[CloudModelSelector] Using stored default model: ${defaultModel}`);
          setSelectedModel(defaultModel);
        } else if (models.length > 0) {
          // Otherwise use the first available model
          console.log(`[CloudModelSelector] Using first available model: ${models[0].name}`);
          setSelectedModel(models[0].name);
          // Store this as the new default model
          chrome.storage.local.set({ [DEFAULT_MODEL_KEY]: models[0].name });
        }
      }
    } catch (error) {
      console.error('[CloudModelSelector] Error fetching models:', error);
      setModelError(error instanceof Error ? error.message : 'Failed to load models');
    } finally {
      setIsLoadingModels(false);
    }
  }, [selectedModel, setSelectedModel, defaultModel]);

  // Load models on component mount
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Refetch models when user changes (login/logout)
  useEffect(() => {
    if (fetchModels) {
      console.log('[CloudModelSelector] User state changed, refetching models');
      fetchModels();
    }
  }, [user, fetchModels]);

  // Handle model selection changes
  const handleModelChange = useCallback(
    (model: string) => {
      setSelectedModel(model);
      // Save selected model as default
      chrome.storage.local.set({ [DEFAULT_MODEL_KEY]: model });
      console.log('[CloudModelSelector] Saved new default model:', model);
    },
    [setSelectedModel, DEFAULT_MODEL_KEY],
  );

  return (
    <ModelSelector
      selectedModel={selectedModel}
      setSelectedModel={handleModelChange}
      openaiModels={openaiModels}
      geminiModels={geminiModels}
      anthropicModels={anthropicModels}
      ollamaModels={ollamaModels}
      isLoadingModels={isLoadingModels}
      modelError={modelError}
    />
  );
};
