import { useStorage } from '@extension/shared';
import { openAIKeyStorage, defaultLanguageStorage } from '@extension/storage';
import { DevLocale, t } from '@extension/i18n';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface OpenAITabProps {
  isLight: boolean;
  showOpenAIKey: boolean;
  setShowOpenAIKey: (show: boolean) => void;
  isLoadingModels?: boolean;
  modelError?: string | null;
  openaiModels?: Array<{ name: string; displayName?: string; provider: string }>;
}

export const OpenAITab = ({
  isLight,
  showOpenAIKey,
  setShowOpenAIKey,
  isLoadingModels = false,
  modelError = null,
  openaiModels = [],
}: OpenAITabProps) => {
  const openAIKey = useStorage(openAIKeyStorage);
  const language = useStorage(defaultLanguageStorage);

  // Update translations when language changes
  useEffect(() => {
    if (language) {
      // Set the locale directly from storage
      t.devLocale = language as DevLocale;
      console.log('OpenAITab: Language set to', language);
    }
  }, [language]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">{t('options_openai_settings')}</h2>
        <p className="text-sm text-muted-foreground">{t('options_openai_description')}</p>
      </div>
      <div>
        <label
          htmlFor="openai-key"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {t('options_api_key')}
        </label>
        <div className="relative">
          <input
            id="openai-key"
            type={showOpenAIKey ? 'text' : 'password'}
            value={openAIKey}
            onChange={e => openAIKeyStorage.set(e.target.value)}
            className={`w-full p-3 pr-10 rounded-md border transition-colors focus:border-blue-500 focus:outline-none ${
              isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
            }`}
            placeholder="sk-..."
          />
          <button
            type="button"
            onClick={() => setShowOpenAIKey(!showOpenAIKey)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {showOpenAIKey ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      {/* API Key Status */}
      <div className="mt-4">
        {isLoadingModels ? (
          <p className="text-sm text-blue-500">{t('options_validating_key')}</p>
        ) : modelError ? (
          <p className="text-sm text-red-500">{modelError}</p>
        ) : openaiModels.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-green-500">{t('options_key_valid', [openaiModels.length])}</p>

            {/* Models List */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-blue-500">{t('options_available_models')}</h4>
              <div
                className={`bg-opacity-5 rounded-md border ${isLight ? 'bg-black border-black/10' : 'bg-white border-white/10'}`}>
                {openaiModels.map(model => (
                  <div
                    key={model.name}
                    className={`p-3 border-b last:border-b-0 ${isLight ? 'border-black/5' : 'border-white/5'}`}>
                    <div className="font-medium">{model.displayName || model.name}</div>
                    <div className="text-sm opacity-60 mt-1">{model.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};
