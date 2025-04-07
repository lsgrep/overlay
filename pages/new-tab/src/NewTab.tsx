import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, defaultLanguageStorage } from '@extension/storage';
import { t } from '@extension/i18n';
import type { DevLocale } from '@extension/i18n/lib/type';
import { useState, useEffect } from 'react';
import { TaskManager } from './components/TaskManager';
import quotesData from './quotes.json';

// Define interfaces for quotes data structure
interface QuoteData {
  text: string;
  author: string;
}

interface CategoryData {
  name: string;
  quotes: QuoteData[];
}

interface QuotesData {
  categories: {
    [key: string]: CategoryData;
  };
}

const NewTab = () => {
  const theme = useStorage(exampleThemeStorage);
  const defaultLanguage = useStorage(defaultLanguageStorage);
  const isLight = theme === 'light';
  const [randomQuote, setRandomQuote] = useState({ text: '', author: '', category: '' });

  // Update translations when language changes
  useEffect(() => {
    if (defaultLanguage) {
      // Set the locale directly from storage
      t.devLocale = defaultLanguage;
      console.log('NewTab: Language set to', defaultLanguage);

      // Update document title with translated "New Page"
      document.title = t('new_page', 'New Page');
    }
  }, [defaultLanguage]);

  useEffect(() => {
    // Type cast quotesData to our interface
    const typedQuotesData = quotesData as unknown as QuotesData;
    const categories = Object.keys(typedQuotesData.categories);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const categoryQuotes = typedQuotesData.categories[randomCategory].quotes;
    const randomQuoteData = categoryQuotes[Math.floor(Math.random() * categoryQuotes.length)];

    setRandomQuote({
      text: randomQuoteData.text,
      author: randomQuoteData.author,
      category: typedQuotesData.categories[randomCategory].name,
    });

    // Set document title
    document.title = t('new_page', 'New Page');
  }, []);

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      {/* Header with Overlay logo */}
      <div className="flex items-center justify-between px-8 py-6 relative z-20">
        <div className="flex items-center">
          <img src="/icon-128.png" alt="Overlay icon" className="w-8 h-8 mr-3" />
          <h1 className="text-xl font-semibold bg-gradient-text bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
            {t('extensionName')}
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <a href="chrome://extensions" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            {t('extensions', 'Extensions')}
          </a>
          <a href="chrome://bookmarks" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            {t('bookmarks', 'Bookmarks')}
          </a>
        </div>
      </div>

      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div
          className={`absolute -inset-[10px] opacity-30 z-0 ${isLight ? 'bg-[radial-gradient(circle_at_center,_#4f46e520_1px,_transparent_1px)] [background-size:24px_24px]' : 'bg-[radial-gradient(circle_at_center,_#6366f120_1px,_transparent_1px)] [background-size:24px_24px]'}`}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-start pt-8 pb-16 px-4">
        <div className="w-full max-w-6xl mx-auto mb-8">
          {/* Task Manager - Full width */}
          <TaskManager isLight={isLight} />
        </div>

        {/* AI Tools section */}
        {/* <AITools isLight={isLight} /> */}
        {/* Quote section - Bottom (small) */}
        <div className="w-full max-w-3xl mx-auto mt-8">
          <div
            className={`p-4 text-center relative rounded-xl shadow-sm backdrop-blur-sm ${isLight ? 'bg-card/30' : 'bg-card/30'}`}>
            <div className={`relative z-10`}>
              <blockquote className="text-sm font-serif italic mb-2 leading-relaxed">
                <span className={`${isLight ? 'text-gray-700' : 'text-gray-300'}`}>"{randomQuote.text}"</span>
              </blockquote>
              <div className="flex justify-center items-center space-x-2">
                <p className={`text-xs italic ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  — {randomQuote.author}
                </p>
                <span className={`w-1 h-1 rounded-full ${isLight ? 'bg-gray-400' : 'bg-gray-500'}`} />
                <p
                  className={`text-xs uppercase tracking-widest font-light ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {randomQuote.category}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(NewTab, <div className="p-4 text-center">{t('loading')}</div>),
  <div className="p-4 text-center text-red-500">{t('error')}</div>,
);
