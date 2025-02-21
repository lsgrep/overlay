// import '@src/Options.css';
import { useEffect, useState } from 'react';
import { useStorage, withErrorBoundary, withSuspense, ModelService } from '@extension/shared';
import {
  SunIcon,
  MoonIcon,
  Cog6ToothIcon,
  KeyIcon,
  CloudIcon,
  SparklesIcon,
  PaintBrushIcon,
  LanguageIcon,
} from '@heroicons/react/24/solid';
import {
  exampleThemeStorage,
  openAIKeyStorage,
  geminiKeyStorage,
  anthropicKeyStorage,
  fontFamilyStorage,
  fontSizeStorage,
} from '@extension/storage';
import { Button } from '@extension/ui';
import icon from '../../../chrome-extension/public/icon-128.png';
import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { GeneralTab, OpenAITab, GoogleTab, AnthropicTab, AppearanceTab } from './components/tabs';
const Options = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  // API key states
  const openAIKey = useStorage(openAIKeyStorage);
  const geminiKey = useStorage(geminiKeyStorage);
  const anthropicKey = useStorage(anthropicKeyStorage);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);

  const [openaiModels, setOpenAIModels] = useState<Array<{ name: string; displayName?: string; provider: string }>>([]);
  const [googleModels, setGoogleModels] = useState<Array<{ name: string; displayName?: string; provider: string }>>([]);
  const [ollamaModels, setOllamaModels] = useState<Array<{ name: string; displayName?: string; provider: string }>>([]);
  const [anthropicModels, setAnthropicModels] = useState<
    Array<{ name: string; displayName?: string; provider: string }>
  >([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // New state variables for additional settings
  const [selectedModel, setSelectedModel] = useState('');
  const [maxTokens, setMaxTokens] = useState(2000);
  const [temperature, setTemperature] = useState(0.7);
  const [language, setLanguage] = useState('english');
  const [availableLanguages] = useState([
    { code: 'english', name: 'English' },
    { code: 'spanish', name: 'Español' },
    { code: 'french', name: 'Français' },
    { code: 'german', name: 'Deutsch' },
    { code: 'italian', name: 'Italiano' },
    { code: 'portuguese', name: 'Português' },
    { code: 'russian', name: 'Русский' },
    { code: 'chinese', name: '中文' },
    { code: 'japanese', name: '日本語' },
    { code: 'korean', name: '한국어' },
  ]);
  const fontFamily = useStorage(fontFamilyStorage);
  const fontSize = useStorage(fontSizeStorage);

  // State for tab navigation
  const [activeTab, setActiveTab] = useState('General');

  useEffect(() => {
    // Load saved settings
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

  // Fetch models when API keys change
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoadingModels(true);
        setModelError(null);

        const { openai, anthropic, ollama, gemini } = await ModelService.fetchAllModels();
        setOpenAIModels(openai);
        setAnthropicModels(anthropic);
        setOllamaModels(ollama);
        setGoogleModels(gemini);
      } catch (error) {
        console.error('Error fetching models:', error);
        setModelError(error instanceof Error ? error.message : 'Failed to fetch models');
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [geminiKey, anthropicKey]);

  // Apply font settings to the document
  useEffect(() => {
    if (fontFamily) {
      document.documentElement.style.setProperty('--font-family', fontFamily);
    }
  }, [fontFamily]);

  useEffect(() => {
    if (fontSize) {
      document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
    }
  }, [fontSize]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      // Save all settings
      await Promise.all(
        [language && setDefaultLanguage(language), selectedModel && setDefaultModel(selectedModel)].filter(Boolean),
      );
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
            <div className="flex items-center gap-2">
              {isLight ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
              <span>{isLight ? 'Dark' : 'Light'} mode</span>
            </div>
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
              {[
                { name: 'General', icon: <Cog6ToothIcon className="w-5 h-5" /> },
                { name: 'OpenAI', icon: <KeyIcon className="w-5 h-5" /> },
                { name: 'Google', icon: <CloudIcon className="w-5 h-5" /> },
                { name: 'Anthropic', icon: <KeyIcon className="w-5 h-5" /> },
                { name: 'Appearance', icon: <PaintBrushIcon className="w-5 h-5" /> },
                { name: 'Language', icon: <LanguageIcon className="w-5 h-5" /> },
              ].map(({ name: tab, icon }) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-6 py-3 rounded-lg transition-all duration-200 font-medium flex items-center gap-3 ${
                    activeTab === tab
                      ? 'bg-blue-500 text-white'
                      : `${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-900'} text-gray-500`
                  }`}>
                  {icon}
                  <span>{tab}</span>
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
                <GeneralTab
                  isLight={isLight}
                  language={language}
                  setLanguage={setLanguage}
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                  availableLanguages={availableLanguages}
                  openaiModels={openaiModels}
                  googleModels={googleModels}
                  ollamaModels={ollamaModels}
                  anthropicModels={anthropicModels}
                  isLoadingModels={isLoadingModels}
                  modelError={modelError}
                />
              )}

              {activeTab === 'OpenAI' && (
                <OpenAITab
                  isLight={isLight}
                  showOpenAIKey={showOpenAIKey}
                  setShowOpenAIKey={setShowOpenAIKey}
                  isLoadingModels={isLoadingModels}
                  modelError={modelError}
                  openaiModels={openaiModels}
                />
              )}

              {activeTab === 'Google' && (
                <GoogleTab
                  isLight={isLight}
                  showGeminiKey={showGeminiKey}
                  setShowGeminiKey={setShowGeminiKey}
                  isLoadingModels={isLoadingModels}
                  modelError={modelError}
                  googleModels={googleModels}
                />
              )}

              {activeTab === 'Anthropic' && (
                <AnthropicTab
                  isLight={isLight}
                  showAnthropicKey={showAnthropicKey}
                  setShowAnthropicKey={setShowAnthropicKey}
                  isLoadingModels={isLoadingModels}
                  modelError={modelError}
                  anthropicModels={anthropicModels}
                />
              )}

              {activeTab === 'Appearance' && <AppearanceTab isLight={isLight} />}

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
    <Tooltip id="anthropic-tooltip" />
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
