import { useEffect, useState } from 'react';
import { useStorage, withErrorBoundary, withSuspense, ModelService } from '@extension/shared';
import { Cog6ToothIcon, PaintBrushIcon, SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import { UserIcon } from '@heroicons/react/24/outline';
import { OpenAIIcon, GeminiIcon, AnthropicIcon, OllamaIcon } from '@extension/ui';
import { Cpu } from 'lucide-react';
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
import {
  GeneralTab,
  OpenAITab,
  GoogleTab,
  AnthropicTab,
  OllamaTab,
  AppearanceTab,
  ProfileTab,
} from './components/tabs';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@extension/ui/lib/ui/sidebar';
import { cn } from '@extension/ui/lib/utils';

const Options = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  // Apply theme class to document element
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (theme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [theme]);

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
  // State for nested LLM tab navigation
  const [activeLLMTab, setActiveLLMTab] = useState('OpenAI');

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

  // Render LLM provider tab content based on active provider tab
  const renderLLMTabContent = () => {
    switch (activeLLMTab) {
      case 'OpenAI':
        return (
          <OpenAITab
            isLight={isLight}
            showOpenAIKey={showOpenAIKey}
            setShowOpenAIKey={setShowOpenAIKey}
            isLoadingModels={isLoadingModels}
            modelError={modelError}
            openaiModels={openaiModels}
          />
        );
      case 'Google':
        return (
          <GoogleTab
            isLight={isLight}
            showGeminiKey={showGeminiKey}
            setShowGeminiKey={setShowGeminiKey}
            isLoadingModels={isLoadingModels}
            modelError={modelError}
            googleModels={googleModels}
          />
        );
      case 'Anthropic':
        return (
          <AnthropicTab
            isLight={isLight}
            showAnthropicKey={showAnthropicKey}
            setShowAnthropicKey={setShowAnthropicKey}
            isLoadingModels={isLoadingModels}
            modelError={modelError}
            anthropicModels={anthropicModels}
          />
        );
      case 'Ollama':
        return (
          <OllamaTab
            isLight={isLight}
            isLoadingModels={isLoadingModels}
            modelError={modelError}
            ollamaModels={ollamaModels}
          />
        );
      default:
        return null;
    }
  };

  // Render tab content based on active main tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'General':
        return (
          <GeneralTab
            openaiModels={openaiModels}
            googleModels={googleModels}
            ollamaModels={ollamaModels}
            anthropicModels={anthropicModels}
            isLoadingModels={isLoadingModels}
            modelError={modelError}
            isLight={isLight}
          />
        );
      case 'LLM':
        // Directly render the LLM provider content based on active selection
        switch (activeLLMTab) {
          case 'OpenAI':
            return (
              <OpenAITab
                isLight={isLight}
                showOpenAIKey={showOpenAIKey}
                setShowOpenAIKey={setShowOpenAIKey}
                isLoadingModels={isLoadingModels}
                modelError={modelError}
                openaiModels={openaiModels}
              />
            );
          case 'Google':
            return (
              <GoogleTab
                isLight={isLight}
                showGeminiKey={showGeminiKey}
                setShowGeminiKey={setShowGeminiKey}
                isLoadingModels={isLoadingModels}
                modelError={modelError}
                googleModels={googleModels}
              />
            );
          case 'Anthropic':
            return (
              <AnthropicTab
                isLight={isLight}
                showAnthropicKey={showAnthropicKey}
                setShowAnthropicKey={setShowAnthropicKey}
                isLoadingModels={isLoadingModels}
                modelError={modelError}
                anthropicModels={anthropicModels}
              />
            );
          case 'Ollama':
            return (
              <OllamaTab
                isLight={isLight}
                isLoadingModels={isLoadingModels}
                modelError={modelError}
                ollamaModels={ollamaModels}
              />
            );
          default:
            return null;
        }
      case 'Profile':
        return <ProfileTab isLight={isLight} />;
      case 'Appearance':
        return <AppearanceTab isLight={isLight} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300 bg-background text-foreground min-w-[1100px] overflow-auto">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full py-6 px-8 border-b border-border sticky top-0 z-10 bg-background">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <motion.img
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              src={icon}
              alt="Overlay"
              className="h-8 w-8 cursor-pointer"
              onClick={() => window.open('https://overlay.one', '_blank')}
              title={t('visit_overlay_website', 'Visit Overlay Website')}
            />
            <h1 className="text-xl font-semibold bg-gradient-text bg-clip-text">Overlay</h1>
          </div>
          <button
            onClick={() => exampleThemeStorage.set(isLight ? 'dark' : 'light')}
            className="p-2 rounded-full transition-colors bg-muted hover:bg-muted/80 text-muted-foreground"
            data-tooltip-id="theme-tooltip"
            data-tooltip-content={
              isLight ? t('switch_to_dark', 'Switch to Dark Mode') : t('switch_to_light', 'Switch to Light Mode')
            }>
            {isLight ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>

      {/* Main Content with shadcn Sidebar */}
      <SidebarProvider defaultOpen={true}>
        <div className="max-w-7xl mx-auto flex min-w-[1000px]">
          <Sidebar variant="sidebar" collapsible="none" className="h-[calc(100vh-72px)] border-r border-border">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>General</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveTab('General')} isActive={activeTab === 'General'}>
                        <Cog6ToothIcon className="w-5 h-5" />
                        <span>{t('options_tab_general')}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>Language Models</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          setActiveTab('LLM');
                          setActiveLLMTab('OpenAI');
                        }}
                        isActive={activeTab === 'LLM' && activeLLMTab === 'OpenAI'}>
                        <OpenAIIcon className="w-5 h-5" />
                        <span>OpenAI</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          setActiveTab('LLM');
                          setActiveLLMTab('Google');
                        }}
                        isActive={activeTab === 'LLM' && activeLLMTab === 'Google'}>
                        <GeminiIcon className="w-5 h-5" />
                        <span>Google AI</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          setActiveTab('LLM');
                          setActiveLLMTab('Anthropic');
                        }}
                        isActive={activeTab === 'LLM' && activeLLMTab === 'Anthropic'}>
                        <AnthropicIcon className="w-5 h-5" />
                        <span>Anthropic</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          setActiveTab('LLM');
                          setActiveLLMTab('Ollama');
                        }}
                        isActive={activeTab === 'LLM' && activeLLMTab === 'Ollama'}>
                        <OllamaIcon className="w-5 h-5" />
                        <span>Ollama</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>User</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveTab('Profile')} isActive={activeTab === 'Profile'}>
                        <UserIcon className="w-5 h-5" />
                        <span>{t('options_tab_profile')}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab('Appearance')}
                        isActive={activeTab === 'Appearance'}>
                        <PaintBrushIcon className="w-5 h-5" />
                        <span>{t('options_tab_appearance')}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          {/* Content Area */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-6 min-w-[800px]">
            <div className="w-full max-w-3xl mx-auto p-6 rounded-lg border border-border bg-card transition-all duration-300">
              <div className="w-full">{renderTabContent()}</div>
            </div>
          </motion.div>
        </div>
      </SidebarProvider>

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
