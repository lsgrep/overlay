import { useStorage } from '@extension/shared';
import { defaultLanguageStorage, defaultModelStorage } from '@extension/storage';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Label,
} from '@extension/ui';

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
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="language">Default Language</Label>
          <Select
            value={language}
            onValueChange={value => {
              setLanguage(value);
              defaultLanguageStorage.set(value);
            }}>
            <SelectTrigger id="language">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {availableLanguages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="default-model">Default Model</Label>
          <Select
            value={selectedModel}
            onValueChange={value => {
              setSelectedModel(value);
              defaultModelStorage.set(value);
            }}>
            <SelectTrigger id="default-model">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {/* OpenAI Models */}
              {openaiModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel>OpenAI Models</SelectLabel>
                  {openaiModels.map(model => (
                    <SelectItem key={model.name} value={model.name}>
                      {model.displayName || model.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {/* Google Models */}
              {googleModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Google Models</SelectLabel>
                  {googleModels.map(model => (
                    <SelectItem key={model.name} value={model.name}>
                      {model.displayName || model.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {/* Anthropic Models */}
              {anthropicModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Anthropic Models</SelectLabel>
                  {anthropicModels.map(model => (
                    <SelectItem key={model.name} value={model.name}>
                      {model.displayName || model.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {/* Ollama Models */}
              {ollamaModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Ollama Models</SelectLabel>
                  {ollamaModels.map(model => (
                    <SelectItem key={model.name} value={model.name}>
                      {model.displayName || model.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {isLoadingModels && (
                <SelectItem value="loading" disabled>
                  Loading models...
                </SelectItem>
              )}
              {modelError && (
                <SelectItem value="error" disabled>
                  Error loading models: {modelError}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );
};
