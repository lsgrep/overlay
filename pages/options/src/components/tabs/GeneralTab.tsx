import { useStorage } from '@extension/shared';
import { getDefaultLanguage, setDefaultLanguage, getDefaultModel, setDefaultModel } from '@extension/storage';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface GeneralTabProps {
  isLight: boolean;
  language: string;
  setLanguage: (lang: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  availableLanguages: Array<{ code: string; name: string }>;
}

export const GeneralTab = ({
  isLight,
  language,
  setLanguage,
  selectedModel,
  setSelectedModel,
  availableLanguages,
}: GeneralTabProps) => {
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [defaultLang, defaultMod] = await Promise.all([getDefaultLanguage(), getDefaultModel()]);
        if (defaultLang) setLanguage(defaultLang);
        if (defaultMod) setSelectedModel(defaultMod);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

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
              setDefaultLanguage(e.target.value);
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
          <select
            id="default-model"
            value={selectedModel}
            onChange={e => {
              setSelectedModel(e.target.value);
              setDefaultModel(e.target.value);
            }}
            className={`w-full p-3 rounded-md border transition-colors focus:border-blue-500 focus:outline-none ${
              isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
            }`}>
            <option value="">Select a model</option>
            {/* Models will be populated from parent component */}
          </select>
        </div>
      </div>
    </motion.div>
  );
};
