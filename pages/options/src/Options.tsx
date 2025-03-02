import { useEffect, useState } from 'react';
import { useStorage, withErrorBoundary, withSuspense, ModelService } from '@extension/shared';
import { Cog6ToothIcon, PaintBrushIcon } from '@heroicons/react/24/solid';
import { OpenAIIcon, GeminiIcon, AnthropicIcon } from '@extension/ui';
import { t } from '@extension/i18n';
import {
  exampleThemeStorage,
  geminiKeyStorage,
  anthropicKeyStorage,
  fontFamilyStorage,
  fontSizeStorage,
  defaultLanguageStorage,
  defaultModelStorage,
} from '@extension/storage';
import icon from '../../../chrome-extension/public/icon-128.png';
import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { GeneralTab, OpenAITab, GoogleTab, AnthropicTab, AppearanceTab } from './components/tabs';
const Options = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  // API key states
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
  const defaultModel = useStorage(defaultModelStorage);
  const language = useStorage(defaultLanguageStorage);
  const fontFamily = useStorage(fontFamilyStorage);
  const fontSize = useStorage(fontSizeStorage);

  // State for tab navigation
  const [activeTab, setActiveTab] = useState('General');

  // Update the translation locale when language changes
  useEffect(() => {
    if (language) {
      console.log('Options: Setting language to', language);
      t.devLocale = language;
      console.log('Options: Language set to', language);
    }
  }, [language]);

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
                { name: 'General', displayName: t('options_tab_general'), icon: <Cog6ToothIcon className="w-5 h-5" /> },
                { name: 'OpenAI', displayName: t('options_tab_openai'), icon: <OpenAIIcon className="w-5 h-5" /> },
                { name: 'Google', displayName: t('options_tab_google'), icon: <GeminiIcon className="w-5 h-5" /> },
                {
                  name: 'Anthropic',
                  displayName: t('options_tab_anthropic'),
                  icon: <AnthropicIcon className="w-5 h-5" />,
                },
                {
                  name: 'Appearance',
                  displayName: t('options_tab_appearance'),
                  icon: <PaintBrushIcon className="w-5 h-5" />,
                },
              ].map(({ name: tab, displayName, icon }) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-6 py-3 rounded-lg transition-all duration-200 font-medium flex items-center gap-3 ${
                    activeTab === tab
                      ? 'bg-blue-500 text-white'
                      : `${isLight ? 'hover:bg-gray-100 text-gray-900' : 'hover:bg-gray-900 text-gray-100'}`
                  }`}>
                  {icon}
                  <span>{displayName}</span>
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
