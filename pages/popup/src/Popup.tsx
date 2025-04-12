import '@src/Popup.css';
import { useEffect, useState } from 'react';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, defaultLanguageStorage } from '@extension/storage';
import type { DevLocale } from '@extension/i18n';
import { t } from '@extension/i18n';
import type { ComponentPropsWithoutRef } from 'react';
import { createClient, getCurrentUserFromStorage, signOut } from '@extension/shared/lib/services/supabase';
import { LoginPage } from './components/LoginPage';
import { Settings } from 'lucide-react';

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const defaultLanguage = useStorage(defaultLanguageStorage);
  const isLight = theme === 'light';
  const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Update translations when language changes
  useEffect(() => {
    if (defaultLanguage) {
      // Set the locale directly from storage
      t.devLocale = defaultLanguage as DevLocale;
      console.log('Popup: Language set to', defaultLanguage);
    }
  }, [defaultLanguage]);

  // Listen for auth completion messages from background script
  useEffect(() => {
    const handleAuthComplete = (message: any) => {
      if (message.action === 'authComplete' && message.payload.success) {
        // Refresh user data
        getUser();
      }
    };

    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleAuthComplete);
      return () => {
        chrome.runtime.onMessage.removeListener(handleAuthComplete);
      };
    }
  }, []);

  // Get user on component mount
  useEffect(() => {
    async function getUser() {
      try {
        setLoading(true);

        // First try to get user from current session
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUser(user);
          console.log('Popup: User from session', user);
        } else {
          // If no session, try to get user from storage tokens
          const storageUser = await getCurrentUserFromStorage();
          if (storageUser) {
            setUser(storageUser);
            console.log('Popup: User from storage', storageUser);
          }
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setLoading(false);
      }
    }

    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
      chrome.notifications.create('inject-error', notificationOptions);
    }

    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        files: ['/content-runtime/index.iife.js'],
      })
      .catch(err => {
        // Handling errors related to other paths
        if (err.message.includes('Cannot access a chrome:// URL')) {
          chrome.notifications.create('inject-error', notificationOptions);
        }
      });
  };

  if (loading) {
    return (
      <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
        <div className="flex items-center justify-center h-full">
          <p className={`${isLight ? 'text-gray-900' : 'text-gray-100'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login page
  if (!user) {
    return (
      <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'} ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <LoginPage />
      </div>
    );
  }

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <div className="flex items-center justify-between w-full mb-4">
          <img src={chrome.runtime.getURL(logo)} className="h-8" alt="logo" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 transition-colors"
              title="Settings">
              <Settings className="h-4 w-4" />
            </button>
            <button
              className="px-2 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1"
              onClick={handleSignOut}>
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="font-medium">Welcome, {user.email}</p>
        </div>

        <button
          className={
            'font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ' +
            (isLight ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-400 text-gray-900 hover:bg-blue-500')
          }
          onClick={injectContentScript}>
          Inject Content Script
        </button>
        <div className="mt-4">
          <ToggleButton
            className={
              'font-bold py-1 px-4 rounded shadow hover:scale-105 ' +
              (isLight ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-green-400 text-gray-900 hover:bg-green-500')
            }>
            Toggle Theme
          </ToggleButton>
        </div>
      </header>
    </div>
  );
};

const ToggleButton = (props: ComponentPropsWithoutRef<'button'>) => {
  const [theme, setTheme] = useStorage(exampleThemeStorage);

  return (
    <button
      {...props}
      onClick={() => {
        setTheme(theme === 'light' ? 'dark' : 'light');
      }}>
      {theme === 'light' ? 'Dark' : 'Light'} mode
    </button>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
