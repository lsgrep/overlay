import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { useEffect, useState } from 'react';

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        setUrl(tabs[0].url || '');
        setTitle(tabs[0].title || '');
      }
    });
  }, []);

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`p-4 border-b ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
        <div className="flex items-center justify-between">
          <h1 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>Side Panel</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="p-4">
        <section className={`mb-6 ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
          <h2 className="text-sm font-medium mb-2">Current Page</h2>
          <div className="space-y-2">
            <p className="text-sm truncate">{title}</p>
            <p className="text-xs text-gray-500 truncate">{url}</p>
          </div>
        </section>

        <section className={`${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
          <h2 className="text-sm font-medium mb-2">Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => chrome.tabs.create({ url: 'https://www.google.com' })}
              className={`w-full text-sm px-4 py-2 rounded ${isLight ? 'bg-white hover:bg-gray-50 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'} border ${isLight ? 'border-gray-200' : 'border-gray-600'}`}>
              Open New Tab
            </button>
          </div>
        </section>
      </main>
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
