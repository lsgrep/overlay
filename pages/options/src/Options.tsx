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

  // Existing API key states
  const [openAIKey, setOpenAIKeyState] = useState('');
  const [geminiKey, setGeminiKeyState] = useState('');
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // New state variables for additional settings
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [maxTokens, setMaxTokens] = useState(2000);
  const [temperature, setTemperature] = useState(0.7);
  const [language, setLanguage] = useState('en');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState('16');

  // State for tab navigation
  const [activeTab, setActiveTab] = useState('General');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

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
      // Save API keys (extend this logic if saving additional settings)
      await Promise.all([setOpenAIKey(openAIKey), setGeminiKey(geminiKey)]);
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
      className={`min-h-screen transition-colors duration-300 ${
        isLight
          ? 'bg-gradient-to-br from-slate-50 to-slate-100 text-gray-900'
          : 'bg-gradient-to-br from-gray-800 to-gray-900 text-gray-100'
      }`}>
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full py-6 px-8 border-b backdrop-blur-md bg-opacity-50 sticky top-0 z-10 ${
          isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900'
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
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex gap-8">
          {/* Vertical Tab Navigation */}
          <div className="w-48 shrink-0">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-2 sticky top-24">
              {['General', 'API Keys', 'AI Models', 'Appearance', 'Language'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-500 text-white'
                      : `${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800'} text-gray-500`
                  }`}>
                  {tab}
                </button>
              ))}
            </motion.div>
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              {/* Tab Content */}
              {activeTab === 'General' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <h2 className="text-xl font-bold">Welcome to Settings</h2>
                  <p className="text-sm text-gray-500">Configure your extension preferences using the tabs above.</p>
                </motion.div>
              )}

              {activeTab === 'API Keys' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">OpenAI API Key</label>
                    <div className="relative">
                      <input
                        type={showOpenAIKey ? 'text' : 'password'}
                        value={openAIKey}
                        onChange={e => setOpenAIKeyState(e.target.value)}
                        className={`w-full p-3 pr-10 rounded-md border transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                          isLight ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600'
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
                  <div>
                    <label className="block text-sm font-medium mb-2">Gemini API Key</label>
                    <div className="relative">
                      <input
                        type={showGeminiKey ? 'text' : 'password'}
                        value={geminiKey}
                        onChange={e => setGeminiKeyState(e.target.value)}
                        className={`w-full p-3 pr-10 rounded-md border transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                          isLight ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600'
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
                </motion.div>
              )}

              {activeTab === 'AI Models' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Default Model</label>
                    <select
                      value={selectedModel}
                      onChange={e => setSelectedModel(e.target.value)}
                      className={`w-full p-3 rounded-md border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        isLight ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600'
                      }`}>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="gemini-pro">Gemini Pro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Tokens</label>
                    <input
                      type="range"
                      min="100"
                      max="4000"
                      step="100"
                      value={maxTokens}
                      onChange={e => setMaxTokens(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-500">{maxTokens} tokens</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Temperature</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={e => setTemperature(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-500">{temperature}</div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'Appearance' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Font Family</label>
                    <select
                      value={fontFamily}
                      onChange={e => setFontFamily(e.target.value)}
                      className={`w-full p-3 rounded-md border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        isLight ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600'
                      }`}>
                      <option value="Inter">Inter</option>
                      <option value="system-ui">System</option>
                      <option value="monospace">Monospace</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Font Size</label>
                    <select
                      value={fontSize}
                      onChange={e => setFontSize(e.target.value)}
                      className={`w-full p-3 rounded-md border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
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
                    <label className="block text-sm font-medium mb-2">Preferred Language</label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className={`w-full p-3 rounded-md border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
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
              <div className="flex items-center justify-end mt-6">
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
