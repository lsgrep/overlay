import { useStorage } from '@extension/shared';
import { defaultLanguageStorage, defaultModelStorage } from '@extension/storage';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface GeneralTabProps {
  isLight: boolean;
  language: string;
  setLanguage: (lang: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  availableLanguages: Array<{ code: string; name: string }>;
  openaiModels: Array<{ name: string; displayName?: string; provider: string }>;
  googleModels: Array<{ name: string; displayName?: string; provider: string }>;
  ollamaModels: Array<{ name: string; displayName?: string; provider: string }>;
  anthropicModels: Array<{ name: string; displayName?: string; provider: string }>;
  isLoadingModels: boolean;
  modelError: string | null;
}

export const GeneralTab = ({
  isLight,
  language,
  setLanguage,
  selectedModel,
  setSelectedModel,
  availableLanguages,
  openaiModels = [],
  googleModels = [],
  ollamaModels = [],
  anthropicModels = [],
  isLoadingModels = false,
  modelError = null,
}: GeneralTabProps) => {
  // Use storage hooks for language and model
  const defaultLanguage = useStorage(defaultLanguageStorage);
  const defaultModel = useStorage(defaultModelStorage);

  // Update language and model when storage changes
  useEffect(() => {
    if (defaultLanguage) setLanguage(defaultLanguage);
  }, [defaultLanguage, setLanguage]);

  useEffect(() => {
    if (defaultModel) setSelectedModel(defaultModel);
  }, [defaultModel, setSelectedModel]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">General Settings</h3>
        <p className="text-sm opacity-60">Configure your default preferences for the AI assistant</p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="language" className="block text-sm font-semibold mb-2 text-blue-500">
            Default Language
          </label>
          <select
            id="language"
            value={language}
            onChange={e => {
              setLanguage(e.target.value);
              defaultLanguageStorage.set(e.target.value);
            }}
            className={`w-full p-3 rounded-md border transition-colors focus:border-blue-500 focus:outline-none ${
              isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
            }`}>
            {availableLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="default-model" className="block text-sm font-semibold mb-2 text-blue-500">
            Default Model
          </label>
          <div className={`rounded-md border ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
            <select
              id="default-model"
              value={selectedModel}
              onChange={e => {
                setSelectedModel(e.target.value);
                defaultModelStorage.set(e.target.value);
              }}
              className={`w-full p-3 bg-transparent focus:outline-none ${isLight ? 'text-black' : 'text-white'}`}>
              <option value="" className={isLight ? 'bg-black/5' : 'bg-white/5'}>
                Select a model
              </option>
              {/* OpenAI Models */}
              {openaiModels.length > 0 && (
                <optgroup label="OpenAI Models">
                  {openaiModels.map(model => (
                    <option key={model.name} value={model.name}>
                      {model.displayName || model.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {/* Google Models */}
              {googleModels.length > 0 && (
                <optgroup label="Google Models">
                  {googleModels.map(model => (
                    <option key={model.name} value={model.name}>
                      {model.displayName || model.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {/* Anthropic Models */}
              {anthropicModels.length > 0 && (
                <optgroup label="Anthropic Models">
                  {anthropicModels.map(model => (
                    <option key={model.name} value={model.name}>
                      {model.displayName || model.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {/* Ollama Models */}
              {ollamaModels.length > 0 && (
                <optgroup label="Ollama Models">
                  {ollamaModels.map(model => (
                    <option key={model.name} value={model.name}>
                      {model.displayName || model.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {isLoadingModels && <option disabled>Loading models...</option>}
              {modelError && <option disabled>Error loading models: {modelError}</option>}
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
