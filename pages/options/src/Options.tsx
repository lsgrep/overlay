import '@src/Options.css';
import { useEffect, useState } from 'react';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, getOpenAIKey, getGeminiKey, setOpenAIKey, setGeminiKey } from '@extension/storage';
import { Button } from '@extension/ui';

const Options = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [openAIKey, setOpenAIKeyState] = useState('');
  const [geminiKey, setGeminiKeyState] = useState('');
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
    <div className={`min-h-screen p-8 ${isLight ? 'bg-slate-50 text-gray-900' : 'bg-gray-800 text-gray-100'}`}>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Extension Settings</h1>
          <Button onClick={exampleThemeStorage.toggle} theme={theme}>
            {isLight ? '🌙' : '☀️'} Toggle theme
          </Button>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">API Keys</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="openai-key" className="block text-sm font-medium mb-1">
                  OpenAI API Key
                </label>
                <input
                  id="openai-key"
                  type="password"
                  value={openAIKey}
                  onChange={e => setOpenAIKeyState(e.target.value)}
                  className={`w-full p-2 rounded border ${isLight ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600'}`}
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label htmlFor="gemini-key" className="block text-sm font-medium mb-1">
                  Gemini API Key
                </label>
                <input
                  id="gemini-key"
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKeyState(e.target.value)}
                  className={`w-full p-2 rounded border ${isLight ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600'}`}
                  placeholder="AI..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button onClick={handleSave} disabled={isSaving} theme={theme} className="px-4 py-2">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            {saveStatus === 'success' && <span className="text-green-500">✓ Settings saved successfully</span>}
            {saveStatus === 'error' && <span className="text-red-500">Failed to save settings</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <div> Loading ... </div>), <div> Error Occur </div>);
