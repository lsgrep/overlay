import '@src/Options.css';
import { useEffect, useState } from 'react';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, getOpenAIKey, getGeminiKey, setOpenAIKey, setGeminiKey } from '@extension/storage';
import { Button } from '@extension/ui';
import icon from '../../../chrome-extension/public/icon-128.png';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from 'react-tooltip';

const Options = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [openAIKey, setOpenAIKeyState] = useState('');
  const [geminiKey, setGeminiKeyState] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  useEffect(() => {
    // Load saved API keys
    const loadKeys = async () => {
      const [openai, gemini] = await Promise.all([getOpenAIKey(), getGeminiKey()]);
      if (openai) setOpenAIKeyState(openai);
      if (gemini) setGeminiKeyState(gemini);
    };
    loadKeys();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await Promise.all([setOpenAIKey(openAIKey), setGeminiKey(geminiKey)]);
      setSaveStatus('success');
    } catch (error) {
      console.error('Failed to save API keys:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isLight ? 'bg-gradient-to-br from-slate-50 to-slate-100 text-gray-900' : 'bg-gradient-to-br from-gray-800 to-gray-900 text-gray-100'}`}>
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full py-6 px-8 border-b backdrop-blur-md bg-opacity-50 sticky top-0 z-10 ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900'}`}>
        <div className="max-w-2xl mx-auto flex justify-between items-center">
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
            className="transition-all duration-300 hover:scale-105 hover:shadow-lg"
            data-tooltip-id="theme-tooltip"
            data-tooltip-content={`Switch to ${isLight ? 'Dark' : 'Light'} mode`}>
            {isLight ? '🌙' : '☀️'} {isLight ? 'Dark' : 'Light'} mode
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Configure your extension preferences and API keys
          </p>
        </div>

        <div className="space-y-8">
          <motion.div
            className={`p-6 rounded-lg shadow-lg ${isLight ? 'bg-white' : 'bg-gray-750'} border ${isLight ? 'border-gray-200' : 'border-gray-700'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-blue-500">🔑</span> API Keys
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
              Configure your AI service API keys for enhanced functionality
            </p>

            <div className="space-y-6">
              <div>
                <label htmlFor="openai-key" className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <img src="https://openai.com/favicon.ico" className="w-4 h-4" alt="OpenAI" />
                  OpenAI API Key
                  <span
                    className="ml-1 text-xs text-gray-500 dark:text-gray-400 cursor-help"
                    data-tooltip-id="openai-tooltip"
                    data-tooltip-content="Your OpenAI API key is required for AI-powered features. Get it from OpenAI's website.">
                    ℹ️
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="openai-key"
                    type={showOpenAIKey ? 'text' : 'password'}
                    value={openAIKey}
                    onChange={e => setOpenAIKeyState(e.target.value)}
                    className={`w-full p-3 pr-10 rounded-md border transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none
                      ${isLight ? 'bg-white border-gray-300 focus:border-blue-500' : 'bg-gray-700 border-gray-600 focus:border-blue-400'}`}
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    {showOpenAIKey ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="gemini-key" className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <img
                    src="https://ai.google.dev/static/site-assets/images/favicon.ico"
                    className="w-4 h-4"
                    alt="Gemini"
                  />
                  Gemini API Key
                  <span
                    className="ml-1 text-xs text-gray-500 dark:text-gray-400 cursor-help"
                    data-tooltip-id="gemini-tooltip"
                    data-tooltip-content="Your Gemini API key enables Google's AI features. Get it from Google AI Studio.">
                    ℹ️
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="gemini-key"
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={e => setGeminiKeyState(e.target.value)}
                    className={`w-full p-3 pr-10 rounded-md border transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none
                      ${isLight ? 'bg-white border-gray-300 focus:border-blue-500' : 'bg-gray-700 border-gray-600 focus:border-blue-400'}`}
                    placeholder="AI..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    {showGeminiKey ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center justify-between">
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
            <AnimatePresence>
              {saveStatus && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md ${saveStatus === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {saveStatus === 'success' ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Settings saved successfully
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Failed to save settings
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
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
