import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
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

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';

  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'interactive' | 'conversational'>('conversational');

  useEffect(() => {
    // Fetch Ollama models
    const fetchModels = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:11434/v1/models');
        const data: OllamaResponse = await response.json();
        setModels(data.data);
        if (data.data.length > 0) {
          setSelectedModel(data.data[0].id);
        }
      } catch (err) {
        setError('Failed to fetch models. Make sure Ollama is running.');
        console.error('Error fetching models:', err);
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
          <h1 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>Ollama Chat</h1>
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
                <option>Error loading models</option>
              ) : (
                models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.id}
                  </option>
                ))
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
                className={`px-3 py-1 rounded-md text-sm transition-colors ${mode === 'conversational' ? (isLight ? 'bg-white shadow-sm' : 'bg-gray-700') : ''}`}>
                Conversational
              </button>
              <button
                onClick={() => setMode('interactive')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${mode === 'interactive' ? (isLight ? 'bg-white shadow-sm' : 'bg-gray-700') : ''}`}>
                Interactive
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ChatInterface selectedModel={selectedModel} isLight={isLight} mode={mode} />
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
