import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense, ModelService } from '@extension/shared';
import {
  exampleThemeStorage,
  geminiKeyStorage,
  anthropicKeyStorage,
  getDefaultModel,
  setDefaultModel,
} from '@extension/storage';
import { useEffect, useState } from 'react';
import { CONTEXT_MENU_ACTIONS } from './types/chat';
import { ChatInterface } from './ChatInterface';

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [geminiModels, setGeminiModels] = useState<GeminiModel[]>([]);
  const [anthropicModels, setAnthropicModels] = useState<AnthropicModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'interactive' | 'conversational' | 'context-menu'>('conversational');
  const [input, setInput] = useState('');

  // Load default model from storage
  useEffect(() => {
    const loadDefaultModel = async () => {
      const defaultModel = await getDefaultModel();
      if (defaultModel) {
        setSelectedModel(defaultModel);
      }
    };
    loadDefaultModel();
  }, []);

  // Save selected model to storage when it changes
  useEffect(() => {
    if (selectedModel) {
      setDefaultModel(selectedModel);
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

        const { anthropic, ollama, gemini } = await ModelService.fetchAllModels();
        setAnthropicModels(anthropic);
        setOllamaModels(ollama);
        setGeminiModels(gemini);
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
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>Overlay</h1>
          <ThemeToggle />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center space-x-2">
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              disabled={loading}
              className={`flex-1 p-2 rounded border ${isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}`}>
              {loading ? (
                <option>Loading models...</option>
              ) : error ? (
                <option>Error loading models: {error}</option>
              ) : (
                <>
                  <option value="">Select a model</option>
                  {anthropicModels.length > 0 && (
                    <optgroup label={`Anthropic Models (${anthropicModels.length})`}>
                      {anthropicModels.map(model => (
                        <option key={model.name} value={model.name}>
                          {model.displayName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {geminiModels.length > 0 && (
                    <optgroup label={`Gemini Models (${geminiModels.length})`}>
                      {geminiModels.map(model => {
                        console.log('Debug: Rendering Gemini model:', model);
                        return (
                          <option key={model.name} value={model.name}>
                            {model.displayName}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                  {ollamaModels.length > 0 && (
                    <optgroup label={`Ollama Models (${ollamaModels.length})`}>
                      {ollamaModels.map(model => (
                        <option key={model.name} value={model.name}>
                          {model.displayName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </select>
            <button
              onClick={() => chrome.tabs.create({ url: 'https://ollama.ai/library' })}
              className={`p-2 rounded ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}
              title="Browse Ollama Models">
              📚
            </button>
          </div>

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
        <ChatInterface selectedModel={selectedModel} isLight={isLight} mode={mode} initialInput={input} />
      </div>
    </div>
  );
};

const ThemeToggle = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  return (
    <button
      onClick={exampleThemeStorage.toggle}
      className={`p-2 rounded-full ${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`}>
      {isLight ? '🌙' : '☀️'}
    </button>
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
