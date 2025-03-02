// import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense, ModelService } from '@extension/shared';
import { exampleThemeStorage, defaultModelStorage, defaultLanguageStorage } from '@extension/storage';
import { Label, ToggleGroup, ToggleGroupItem } from '@extension/ui';
import { MessageCircle, Blocks } from 'lucide-react';
import { useEffect, useState } from 'react';
import { t, DevLocale } from '@extension/i18n';

import { CONTEXT_MENU_ACTIONS } from './types/chat';
import { ChatInterface } from './ChatInterface';
import { ModelSelector } from './components/ModelSelector';

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const defaultLanguage = useStorage(defaultLanguageStorage);
  const isLight = theme === 'light';
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [geminiModels, setGeminiModels] = useState<GeminiModel[]>([]);
  const [anthropicModels, setAnthropicModels] = useState<AnthropicModel[]>([]);
  const [openaiModels, setOpenAIModels] = useState<Array<{ name: string; displayName?: string; provider: string }>>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'interactive' | 'conversational' | 'context-menu'>('conversational');
  const [input, setInput] = useState('');

  // Update translations when language changes
  useEffect(() => {
    if (defaultLanguage) {
      // Set the locale directly from storage
      t.devLocale = defaultLanguage as DevLocale;
      console.log('SidePanel: Language set to', defaultLanguage);
    }
  }, [defaultLanguage]);

  // Load default model from storage
  useEffect(() => {
    const loadDefaultModel = async () => {
      const defaultModel = await defaultModelStorage.get();
      if (defaultModel) {
        setSelectedModel(defaultModel);
      }
    };
    loadDefaultModel();
  }, []);

  // Save selected model to storage when it changes
  useEffect(() => {
    if (selectedModel) {
      defaultModelStorage.set(selectedModel);
    }
  }, [selectedModel]);

  // Helper function to log both to console and UI
  // Listen for messages
  useEffect(() => {
    const handleMessage = async (message: { type: string; text: string; actionId?: string }) => {
      console.log('Debug: Received message:', message);
      if (!selectedModel) {
        console.log('Debug: No model selected, ignoring message');
        return;
      }

      if (message.type === 'CONTEXT_MENU_ACTION' && message.actionId) {
        console.log('Debug: Processing context menu action:', message.actionId);
        const action = CONTEXT_MENU_ACTIONS.find(a => a.id === message.actionId);
        console.log('Debug: Found action:', action);
        if (action) {
          try {
            const chatInput = await action.prompt(message.text);
            if (chatInput) {
              console.log('Debug: Setting chat input:', chatInput);
              setMode('context-menu');
              setInput(chatInput);
            }
          } catch (error) {
            console.error('Error getting prompt:', error);
          }
        }
      }
    };

    const listener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      console.log('Debug: Message listener called with:', message);
      handleMessage(message).catch(error => {
        console.error('Error handling message:', error);
      });
      // Return true to indicate we want to keep the message channel open for async response
      return true;
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [selectedModel]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        setError('');

        const { anthropic, ollama, gemini, openai } = await ModelService.fetchAllModels();
        setAnthropicModels(anthropic);
        setOllamaModels(ollama);
        setGeminiModels(gemini);
        setOpenAIModels(openai);
      } catch (err) {
        console.error('Error fetching models:', err);
        setError('Failed to fetch models: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="p-4 border-b border-border">
        <div className="flex flex-col gap-4">
          <ModelSelector
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            openaiModels={openaiModels}
            geminiModels={geminiModels}
            ollamaModels={ollamaModels}
            anthropicModels={anthropicModels}
            isLoading={loading}
            error={error}
          />
          <div className="flex items-center gap-4">
            <Label htmlFor="mode-selector" className="min-w-16">
              {t('sidepanel_mode')}
            </Label>
            <ToggleGroup
              id="mode-selector"
              type="single"
              value={mode}
              onValueChange={value => value && setMode(value as 'conversational' | 'interactive')}
              className="flex-1">
              <ToggleGroupItem value="conversational" className="flex-1">
                <MessageCircle className="mr-2" />
                {t('sidepanel_conversational_mode')}
              </ToggleGroupItem>
              <ToggleGroupItem value="interactive" className="flex-1">
                <Blocks className="mr-2" />
                {t('sidepanel_interactive_mode')}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ChatInterface
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          isLight={isLight}
          mode={mode}
          initialInput={input}
          openaiModels={openaiModels}
          geminiModels={geminiModels}
          ollamaModels={ollamaModels}
          anthropicModels={anthropicModels}
          isLoadingModels={loading}
          modelError={error}
        />
      </div>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(
    SidePanel,
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>,
  ),
  <div className="p-4 text-destructive">An error occurred</div>,
);
