import type { Model } from '@extension/shared';
import { useStorage } from '@extension/shared';
import { geminiKeyStorage, defaultLanguageStorage } from '@extension/storage';
import { motion } from 'framer-motion';
import type { DevLocale } from '@extension/i18n';
import { t } from '@extension/i18n';
import { useEffect, useState } from 'react';

interface GoogleTabProps {
  isLight: boolean;
  showGeminiKey: boolean;
  setShowGeminiKey: (show: boolean) => void;
  isLoadingModels: boolean;
  modelError: string | null;
  googleModels: Model[];
}

export const GoogleTab = ({
  isLight,
  showGeminiKey,
  setShowGeminiKey,
  isLoadingModels,
  modelError,
  googleModels,
}: GoogleTabProps) => {
  const geminiKey = useStorage(geminiKeyStorage);
  const language = useStorage(defaultLanguageStorage);
  // Update translations when language changes
  useEffect(() => {
    if (language) {
      // Set the locale directly from storage
      t.devLocale = language as DevLocale;
      console.log('GoogleTab: Language set to', language);
    }
  }, [language]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">{t('options_google_settings')}</h2>
        <p className="text-sm text-muted-foreground">{t('options_google_description')}</p>
      </div>
      <div className="space-y-6">
        <div>
          <label
            htmlFor="gemini-key"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('options_api_key')}
          </label>
          <div className="relative">
            <input
              id="gemini-key"
              type={showGeminiKey ? 'text' : 'password'}
              value={geminiKey}
              onChange={e => geminiKeyStorage.set(e.target.value)}
              className={`w-full p-3 pr-10 rounded-md border transition-colors focus:border-blue-500 focus:outline-none ${
                isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
              }`}
              placeholder="AI..."
            />
            <button
              type="button"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {showGeminiKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>
      </div>

      {/* API Key Status */}
      <div className="mt-4">
        {isLoadingModels ? (
          <p className="text-sm text-blue-500">{t('options_validating_key')}</p>
        ) : modelError ? (
          <p className="text-sm text-red-500">{modelError}</p>
        ) : googleModels.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-green-500">{t('options_key_valid', googleModels.length.toString())}</p>

            {/* Models List */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-blue-500">{t('options_available_models')}</h4>
              <div
                className={`rounded-md border ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                {googleModels.map(model => (
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
