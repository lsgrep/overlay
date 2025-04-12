import { useState, useEffect } from 'react';
import { createClient, getCurrentUserFromStorage, signInWithProvider } from '@extension/shared/lib/services/supabase';
import { t } from '@extension/i18n';
import type { DevLocale } from '@extension/i18n';
import { useStorage } from '@extension/shared';
import { defaultLanguageStorage } from '@extension/storage';
import { Button } from '@extension/ui';

interface LoginGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LoginGuard: React.FC<LoginGuardProps> = ({ children, fallback }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState<string | null>(null);
  const defaultLanguage = useStorage(defaultLanguageStorage);
  const supabase = createClient();
  console.log('LoginGuard: Default language', defaultLanguage);

  // Update translations when language changes
  useEffect(() => {
    if (defaultLanguage) {
      // Set the locale directly from storage
      t.devLocale = defaultLanguage as DevLocale;
    }
  }, [defaultLanguage]);

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
          console.log('LoginGuard: User from session', user);
        } else {
          // If no session, try to get user from storage tokens
          const storageUser = await getCurrentUserFromStorage();
          if (storageUser) {
            setUser(storageUser);
            console.log('LoginGuard: User from storage', storageUser);
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

  // Listen for auth completion messages from background script
  useEffect(() => {
    const handleAuthComplete = (message: any) => {
      if (message.action === 'authComplete' && message.payload.success) {
        // Refresh user data
        getUser();
      }
    };

    async function getUser() {
      try {
        // Get user from current session
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUser(user);
        } else {
          // If no session, try to get user from storage tokens
          const storageUser = await getCurrentUserFromStorage();
          if (storageUser) {
            setUser(storageUser);
          }
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setSigningIn(null); // Reset signing in state
      }
    }

    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleAuthComplete);
      return () => {
        chrome.runtime.onMessage.removeListener(handleAuthComplete);
      };
    }
  }, [supabase]);

  const handleSignIn = async (provider: 'github' | 'google') => {
    try {
      setSigningIn(provider);
      console.log(`Initiating sign in with ${provider}`);
      await signInWithProvider(provider);
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      setSigningIn(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 rounded-lg border border-border bg-card">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-dashed"></div>
            <div className="absolute inset-2 rounded-full bg-card"></div>
          </div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="col-span-1 lg:col-span-3 flex justify-center items-center">
        <div className="w-full max-w-md p-8 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-col items-center justify-center space-y-6 py-6">
            <div className="flex items-center justify-center p-4 bg-primary/10 rounded-full">
              <img src={chrome.runtime.getURL('icon-128.png')} alt="Overlay" className="w-16 h-16" />
            </div>
            <div className="text-center space-y-3 w-full">
              <h3 className="text-xl font-semibold text-foreground">{t('login_required')}</h3>
              <p className="text-sm text-muted-foreground">{t('login_description')}</p>
            </div>
            <div className="flex flex-col w-full gap-4 mt-2">
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2 w-full justify-center"
                onClick={() => handleSignIn('github')}
                disabled={signingIn !== null}>
                {signingIn === 'github' ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span>{t('popup_signing_in')}</span>
                  </div>
                ) : (
                  <>
                    <img src={chrome.runtime.getURL('icon-128.png')} alt="Overlay" className="w-5 h-5" />
                    <span>{t('login_button')}</span>
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">{t('auth_required_message')}</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
