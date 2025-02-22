// import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense, ModelService } from '@extension/shared';
import { exampleThemeStorage, defaultModelStorage } from '@extension/storage';
import { useEffect, useState } from 'react';
import { CONTEXT_MENU_ACTIONS } from './types/chat';
import { ChatInterface } from './ChatInterface';
import { ModelSelector } from './components/ModelSelector';

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
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
    <div className={`flex flex-col h-screen ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`p-4 border-b ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
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
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>Mode:</span>
            <div
              className={`flex items-center gap-2 p-1 rounded-lg border ${isLight ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-800'}`}>
              <button
                onClick={() => setMode('conversational')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${mode === 'conversational' ? (isLight ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white') : ''}`}>
                Conversational
              </button>
              <button
                onClick={() => setMode('interactive')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${mode === 'interactive' ? (isLight ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white') : ''}`}>
                Interactive
              </button>
            </div>
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
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
    </div>,
  ),
  <div className="p-4 text-red-500">An error occurred</div>,
);
