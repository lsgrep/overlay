import '@src/Options.css';
import { useEffect, useState } from 'react';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import {
  exampleThemeStorage,
  getOpenAIKey,
  getGeminiKey,
  setOpenAIKey,
  setGeminiKey,
  getDefaultLanguage,
  setDefaultLanguage,
} from '@extension/storage';
import { Button } from '@extension/ui';
import icon from '../../../chrome-extension/public/icon-128.png';
import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';

const Options = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  // Existing API key states
  const [openAIKey, setOpenAIKeyState] = useState('');
  const [geminiKey, setGeminiKeyState] = useState('');
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  const [googleModels, setGoogleModels] = useState<Array<{ name: string; displayName?: string }>>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // New state variables for additional settings
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [maxTokens, setMaxTokens] = useState(2000);
  const [temperature, setTemperature] = useState(0.7);
  const [language, setLanguage] = useState('en');
  const [availableLanguages] = useState([
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
  ]);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState('16');

  // State for tab navigation
  const [activeTab, setActiveTab] = useState('General');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

  const fetchGoogleModels = async (key: string) => {
    if (!key) return;

    setIsLoadingModels(true);
    setModelError(null);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      setGoogleModels(data.models || []);
    } catch (error) {
      console.error('Error fetching Google models:', error);
      setModelError(error instanceof Error ? error.message : 'Failed to fetch models');
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    // Load saved settings
    const loadSettings = async () => {
      const [openai, gemini, defaultLang] = await Promise.all([getOpenAIKey(), getGeminiKey(), getDefaultLanguage()]);
      if (openai) setOpenAIKeyState(openai);
      if (gemini) {
        setGeminiKeyState(gemini);
        fetchGoogleModels(gemini);
      }
      if (defaultLang) setLanguage(defaultLang);
    };
    loadSettings();
  }, []);

  // Fetch models when Gemini key changes
  useEffect(() => {
    if (geminiKey) {
      fetchGoogleModels(geminiKey);
    } else {
      setGoogleModels([]);
    }
  }, [geminiKey]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      // Save all settings
      await Promise.all([setOpenAIKey(openAIKey), setGeminiKey(geminiKey), setDefaultLanguage(language)]);
      setSaveStatus('success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isLight ? 'bg-white text-black' : 'bg-black text-white'}`}>
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full py-6 px-8 border-b sticky top-0 z-10 ${
          isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-black'
        }`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <motion.img
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              src={icon}
              alt="Overlay"
              className="h-8 w-8"
            />
            <h1 className="text-xl font-semibold bg-gradient-text bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
              Overlay
            </h1>
          </div>
          <Button
            onClick={exampleThemeStorage.toggle}
            theme={theme}
            className="transition-all duration-300 hover:scale-105"
            data-tooltip-id="theme-tooltip"
            data-tooltip-content={`Switch to ${isLight ? 'Dark' : 'Light'} mode`}>
            {isLight ? '🌙' : '☀️'} {isLight ? 'Dark' : 'Light'} mode
          </Button>
        </div>
      </motion.div>

      {/* Main Content with Tabs */}
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex gap-8">
          {/* Vertical Tab Navigation */}
          <div className="w-64 shrink-0">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-2 sticky top-24">
              {['General', 'OpenAI', 'Google', 'AI Models', 'Appearance', 'Language'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-6 py-3 rounded-lg transition-all duration-200 font-medium ${
                    activeTab === tab
                      ? 'bg-blue-500 text-white'
                      : `${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-900'} text-gray-500`
                  }`}>
                  {tab}
                </button>
              ))}
            </motion.div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`space-y-8 p-8 rounded-lg border ${isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'}`}>
              {/* Tab Content */}
              {activeTab === 'General' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-blue-500">General Settings</h2>
                    <p className="text-sm opacity-60">Configure your general extension preferences</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="language" className="block text-sm font-semibold mb-2 text-blue-500">
                        Default Language
                      </label>
                      <select
                        id="language"
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                        className={`w-full p-2 rounded border ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-800 text-white'}`}>
                        {availableLanguages.map(lang => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-sm opacity-60">
                        Select your preferred language for the extension interface
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'OpenAI' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">OpenAI Settings</h3>
                    <p className="text-sm opacity-60">Configure your OpenAI API key and model preferences</p>
                  </div>
                  <div>
                    <label htmlFor="openai-key-2" className="block text-sm font-semibold mb-2 text-blue-500">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        id="openai-key"
                        type={showOpenAIKey ? 'text' : 'password'}
                        value={openAIKey}
                        onChange={e => setOpenAIKeyState(e.target.value)}
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
                </motion.div>
              )}

              {activeTab === 'Google' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Google Settings</h3>
                    <p className="text-sm opacity-60">Configure your Google API key and Gemini model preferences</p>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="gemini-key" className="block text-sm font-semibold mb-2 text-blue-500">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          id="gemini-key"
                          type={showGeminiKey ? 'text' : 'password'}
                          value={geminiKey}
                          onChange={e => setGeminiKeyState(e.target.value)}
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

                    <div>
                      <label htmlFor="available-models" className="block text-sm font-semibold mb-2 text-blue-500">
                        Available Models
                      </label>
                      <div
                        id="available-models"
                        className={`rounded-md border ${isLight ? 'border-black/10' : 'border-white/10'}`}>
                        {isLoadingModels ? (
                          <div className="p-4 text-center text-sm opacity-60">Loading models...</div>
                        ) : modelError ? (
                          <div className="p-4 text-center text-sm text-red-500">{modelError}</div>
                        ) : googleModels.length === 0 ? (
                          <div className="p-4 text-center text-sm opacity-60">
                            {geminiKey ? 'No models found' : 'Enter API key to view available models'}
                          </div>
                        ) : (
                          <div className="divide-y divide-black/10 dark:divide-white/10">
                            {googleModels.map(model => (
                              <div key={model.name} className="p-3 text-sm">
                                <div className="font-medium">{model.displayName || model.name.split('/').pop()}</div>
                                <div className="text-xs opacity-60 mt-1">{model.name}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'AI Models' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div>
                    <label htmlFor="default-model" className="block text-sm font-semibold mb-2 text-blue-500">
                      Default Model
                    </label>
                    <select
                      id="default-model"
                      value={selectedModel}
                      onChange={e => setSelectedModel(e.target.value)}
                      className={`w-full p-3 rounded-md border transition-colors focus:border-blue-500 focus:outline-none ${
                        isLight ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600'
                      }`}>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="gemini-pro">Gemini Pro</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="max-tokens" className="block text-sm font-semibold mb-2 text-blue-500">
                      Max Tokens
                    </label>
                    <input
                      id="max-tokens"
                      type="range"
                      min="100"
                      max="4000"
                      step="100"
                      value={maxTokens}
                      onChange={e => setMaxTokens(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm opacity-60">{maxTokens} tokens</div>
                  </div>
                  <div>
                    <label htmlFor="temperature" className="block text-sm font-semibold mb-2 text-blue-500">
                      Temperature
                    </label>
                    <input
                      id="temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={e => setTemperature(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm opacity-60">{temperature}</div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'Appearance' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div>
                    <label htmlFor="font-family" className="block text-sm font-semibold mb-2 text-blue-500">
                      Font Family
                    </label>
                    <select
                      id="font-family"
                      value={fontFamily}
                      onChange={e => setFontFamily(e.target.value)}
                      className={`w-full p-3 rounded-md border transition-colors focus:border-blue-500 focus:outline-none ${
                        isLight ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600'
                      }`}>
                      <option value="Inter">Inter</option>
                      <option value="system-ui">System</option>
                      <option value="monospace">Monospace</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="font-size" className="block text-sm font-semibold mb-2 text-blue-500">
                      Font Size
                    </label>
                    <select
                      id="font-size"
                      value={fontSize}
                      onChange={e => setFontSize(e.target.value)}
                      className={`w-full p-3 rounded-md border transition-colors focus:border-blue-500 focus:outline-none ${
                        isLight ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600'
                      }`}>
                      <option value="14">Small</option>
                      <option value="16">Medium</option>
                      <option value="18">Large</option>
                    </select>
                  </div>
                </motion.div>
              )}

              {activeTab === 'Language' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div>
                    <label htmlFor="language" className="block text-sm font-semibold mb-2 text-blue-500">
                      Preferred Language
                    </label>
                    <select
                      id="language"
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className={`w-full p-3 rounded-md border transition-colors focus:border-blue-500 focus:outline-none ${
                        isLight ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600'
                      }`}>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>
                </motion.div>
              )}

              {/* Save Button */}
              <div className="flex items-center justify-end mt-8 pt-4 border-t dark:border-gray-700">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  theme={theme}
                  className={`px-6 py-2.5 font-medium transition-all ${!isSaving && 'hover:scale-105'}`}>
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Tooltip for theme toggle */}
      <Tooltip id="theme-tooltip" />
    </div>
  );
};

const OptionsWithTooltips = () => (
  <>
    <Options />
    <Tooltip id="theme-tooltip" />
    <Tooltip id="openai-tooltip" />
    <Tooltip id="gemini-tooltip" />
  </>
);

export default withErrorBoundary(
  withSuspense(
    OptionsWithTooltips,
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>,
  ),
  <div className="flex items-center justify-center min-h-screen text-red-500">
    <div className="text-center">
      <h2 className="text-xl font-bold mb-2">Oops! Something went wrong</h2>
      <p>Please try refreshing the page</p>
    </div>
  </div>,
);
