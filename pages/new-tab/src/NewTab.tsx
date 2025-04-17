import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { overlayApi } from '@extension/shared/lib/services/api';
import { exampleThemeStorage, defaultLanguageStorage, userPreferencesStorage } from '@extension/storage';
import { t } from '@extension/i18n';
import type { DevLocale } from '@extension/i18n/lib/type';
import { useEffect } from 'react';
import { TaskManager } from './components/TaskManager';
import CalendarView from './components/CalendarView';
import { LoginGuard } from './components/LoginGuard';
import quotesData from './quotes.json';
import { Settings, SunIcon, MoonIcon } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const userPreferences = useStorage(userPreferencesStorage);
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

  // Initialize user preferences if null
  useEffect(() => {
    const initUserPreferences = async () => {
      if (userPreferences === null) {
        try {
          // Try to fetch user preferences from the API first
          const apiPreferences = await overlayApi.getUserPreferences();
          console.log('API Preferences:', apiPreferences);
          if (apiPreferences.success && apiPreferences.data) {
            // If API preferences exist, use those
            // Extract values safely with type checking
            let apiTheme = theme; // Keep current theme as default
            let apiDefaultTaskList = '';

            // Only update theme if it's one of the valid theme options ('light' or 'dark')
            if (
              typeof apiPreferences.data.theme === 'string' &&
              (apiPreferences.data.theme === 'light' || apiPreferences.data.theme === 'dark')
            ) {
              apiTheme = apiPreferences.data.theme as 'light' | 'dark';
            }

            if (typeof apiPreferences.data.default_task_list === 'string') {
              apiDefaultTaskList = apiPreferences.data.default_task_list;
            }

            userPreferencesStorage.set({
              theme: apiTheme,
              default_task_list: apiDefaultTaskList,
            });
          } else {
            // If API preferences don't exist, set defaults
            userPreferencesStorage.set({
              theme: theme,
              default_task_list: '',
            });
          }
        } catch (error) {
          console.error('Failed to fetch user preferences:', error);
          // Fallback to defaults on error
          userPreferencesStorage.set({
            theme: theme,
            default_task_list: '',
          });
        }
      }
    };

    initUserPreferences();
  }, [userPreferences, theme]);

  // Update translations when language changes
  useEffect(() => {
    if (defaultLanguage) {
      // Set the locale directly from storage
      t.devLocale = defaultLanguage as DevLocale;
      console.log('NewTab: Language set to', defaultLanguage);

      // Update document title with translated "New Page"
      document.title = t('new_page', 'New Page');
    }
  }, [defaultLanguage]);

  useEffect(() => {
    // Set document title
    document.title = t('new_page', 'New Page');
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-300 bg-background text-foreground">
      {/* Header with Overlay logo */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full py-6 px-8 border-b border-border sticky top-0 z-10 bg-background">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <motion.img
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              src="/icon-128.png"
              alt="Overlay icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => window.open('https://overlay.one', '_blank')}
              title={t('visit_overlay_website', 'Visit Overlay Website')}
            />
            <h1 className="text-xl font-semibold bg-gradient-text bg-clip-text">{t('extensionName')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exampleThemeStorage.set(isLight ? 'dark' : 'light')}
              className="p-2 rounded-md transition-colors hover:bg-muted text-foreground"
              title={
                isLight ? t('switch_to_dark', 'Switch to Dark Mode') : t('switch_to_light', 'Switch to Light Mode')
              }>
              {isLight ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
            </button>
            <a
              href="/options/index.html"
              className="p-2 rounded-md hover:bg-muted/50 transition-colors"
              title={t('settings', 'Settings')}>
              <Settings className="h-4 w-4" />
            </a>
          </div>
        </div>
      </motion.div>

      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute -inset-[10px] opacity-30 z-0 bg-[radial-gradient(circle_at_center,_hsl(var(--primary)/0.13)_1px,_transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          <LoginGuard>
            <>
              {/* Task Manager - Takes 2/3 of the width on large screens and above */}
              <div className="lg:col-span-2">
                <TaskManager userPreferences={userPreferences} />
              </div>

              {/* Calendar View - Takes 1/3 of the width on large screens and above */}
              <div className="lg:col-span-1">
                <CalendarView />
              </div>
            </>
          </LoginGuard>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(NewTab, <div className="p-4 text-center">{t('loading')}</div>),
  <div className="p-4 text-center text-red-500">{t('error')}</div>,
);
