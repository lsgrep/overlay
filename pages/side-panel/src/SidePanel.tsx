import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, getGeminiKey } from '@extension/storage';
import { useEffect, useState } from 'react';
import { ChatInterface } from './ChatInterface';

interface OllamaModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OllamaResponse {
  object: string;
  data: OllamaModel[];
}

interface GeminiModel {
  name: string;
  displayName: string;
}

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [geminiModels, setGeminiModels] = useState<GeminiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'interactive' | 'conversational'>('conversational');
  const [input, setInput] = useState('');

  // Helper function to log both to console and UI
  // Listen for translation requests
  useEffect(() => {
    const handleMessage = (message: { type: string; text: string }) => {
      console.log('Debug: Received message:', message);
      if (!selectedModel) {
        console.log('Debug: No model selected, ignoring message');
        return;
      }

      if (message.type === 'TRANSLATE_TEXT') {
        console.log('Debug: Processing translation request');
        setInput(`Translate the following text to English: "${message.text}"`);
      } else if (message.type === 'SELECTED_TEXT') {
        console.log('Debug: Processing selected text');
        setInput(message.text);
      }
    };

    const listener = (message: any) => {
      console.log('Debug: Message listener called with:', message);
      handleMessage(message);
      // Return true to indicate we want to keep the message channel open
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
        console.log('Debug: Fetching models...');

        // Fetch Ollama models
        try {
          const ollamaResponse = await fetch('http://localhost:11434/v1/models');
          const ollamaData: OllamaResponse = await ollamaResponse.json();
          console.log('Ollama models:', ollamaData.data);
          setOllamaModels(ollamaData.data);
          if (ollamaData.data.length > 0 && !selectedModel) {
            setSelectedModel(ollamaData.data[0].id);
          }
        } catch (err) {
          console.error('Error fetching Ollama models:', err);
        }

        // Fetch Gemini models
        try {
          const geminiKey = await getGeminiKey();
          console.log('Debug: Got Gemini key:', geminiKey ? 'yes' : 'no');
          if (geminiKey) {
            const geminiResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
            );
            if (!geminiResponse.ok) {
              const errorText = await geminiResponse.text();
              console.error('Gemini API Error:', {
                status: geminiResponse.status,
                statusText: geminiResponse.statusText,
                error: errorText,
              });
              throw new Error(`Failed to fetch Gemini models: ${geminiResponse.statusText}`);
            }
            const geminiData = await geminiResponse.json();
            console.log('Debug: Gemini API response:', geminiData);

            const formattedGeminiModels = (geminiData.models || [])
              .filter((model: any) => {
                const isGemini = model.name.includes('gemini') || model.displayName?.toLowerCase().includes('gemini');
                console.log('Debug: Checking model:', model.name, isGemini);
                return isGemini;
              })
              .map((model: any) => {
                const formattedModel = {
                  name: model.name,
                  displayName: model.displayName || model.name.split('/').pop(),
                };
                console.log('Debug: Formatted model:', formattedModel);
                return formattedModel;
              });

            console.log('Debug: Final Gemini models:', formattedGeminiModels);
            setGeminiModels(formattedGeminiModels);
          }
        } catch (err) {
          console.error('Error fetching Gemini models:', err);
          setError('Failed to fetch Gemini models: ' + (err as Error).message);
        }
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
                        <option key={model.id} value={model.id}>
                          {model.id}
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
