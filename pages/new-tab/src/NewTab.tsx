import '@src/NewTab.css';
import '@src/NewTab.scss';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { Button } from '@extension/ui';
import { t } from '@extension/i18n';
import { useState, useEffect } from 'react';
import quotesData from './quotes.json';

const NewTab = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [randomQuote, setRandomQuote] = useState({ text: '', author: '', category: '' });

  useEffect(() => {
    const categories = Object.keys(quotesData.categories);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const categoryQuotes = quotesData.categories[randomCategory].quotes;
    const randomQuoteData = categoryQuotes[Math.floor(Math.random() * categoryQuotes.length)];

    setRandomQuote({
      text: randomQuoteData.text,
      author: randomQuoteData.author,
      category: quotesData.categories[randomCategory].name,
    });
  }, []);
  return (
    <div
      className={`min-h-screen flex flex-col overflow-hidden ${isLight ? 'bg-gradient-to-br from-blue-50 to-purple-50' : 'bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900'}`}>
      {/* Header with Overlay logo */}
      <div className="flex items-center justify-center p-8 relative z-20">
        <img src="/icon-128.png" alt="Overlay icon" className="w-12 h-12 mr-3" />
        <h1 className={`text-3xl font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>Overlay</h1>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        {/* Background pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`absolute -inset-[10px] opacity-30 ${isLight ? 'bg-[radial-gradient(circle_at_center,_#4f46e520_1px,_transparent_1px)] [background-size:24px_24px]' : 'bg-[radial-gradient(circle_at_center,_#6366f120_1px,_transparent_1px)] [background-size:24px_24px]'}`}
          />
        </div>

        {/* Main container */}
        <div
          className={`max-w-3xl mx-auto p-16 text-center relative rounded-2xl shadow-2xl backdrop-blur-sm ${isLight ? 'bg-white/30' : 'bg-gray-800/30'}`}>
          <span className={`absolute top-0 left-0 text-8xl font-serif ${isLight ? 'text-gray-200' : 'text-gray-700'}`}>
            "
          </span>
          <span
            className={`absolute bottom-0 right-0 text-8xl font-serif ${isLight ? 'text-gray-200' : 'text-gray-700'}`}>
            "
          </span>

          <div className={`relative z-10 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
            <blockquote className="text-3xl font-serif italic mb-8 leading-relaxed px-12">
              <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                {randomQuote.text}
              </span>
            </blockquote>
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-0.5 ${isLight ? 'bg-indigo-200' : 'bg-indigo-700'}`} />
                <div className={`w-2 h-2 rounded-full ${isLight ? 'bg-purple-300' : 'bg-purple-600'}`} />
                <div className={`w-12 h-0.5 ${isLight ? 'bg-purple-200' : 'bg-purple-700'}`} />
              </div>
              <div className="flex flex-col space-y-2">
                <p
                  className={`text-sm uppercase tracking-widest font-light ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                  {randomQuote.category}
                </p>
                <p className={`text-sm italic ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                  — {randomQuote.author}
                </p>
              </div>
            </div>
          </div>
          <Button
            className={`mt-12 transition-all duration-300 hover:scale-110 rounded-full p-3
            ${isLight ? 'bg-white/50 hover:bg-white/80' : 'bg-gray-800/50 hover:bg-gray-800/80'}
            backdrop-blur-sm shadow-lg hover:shadow-xl`}
            onClick={exampleThemeStorage.toggle}
            theme={theme}>
            {isLight ? '🌙' : '☀️'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(NewTab, <div>{t('loading')}</div>), <div> Error Occur </div>);
