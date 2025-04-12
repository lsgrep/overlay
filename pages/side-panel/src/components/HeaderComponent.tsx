import type { FC } from 'react';
import { useEffect, useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@extension/ui';
import { ChevronDown, LogOut, Settings, SunIcon, MoonIcon } from 'lucide-react';
import { t } from '@extension/i18n';
import icon from '../../../../chrome-extension/public/icon-128.png';
import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import {
  createClient,
  signInWithProvider,
  signOut,
  getCurrentUserFromStorage,
} from '@extension/shared/lib/services/supabase';

// Using Record<string, unknown> to allow for future props
type HeaderComponentProps = Record<string, unknown>;

export const HeaderComponent: FC<HeaderComponentProps> = () => {
  const supabase = createClient();
  const theme = useStorage(exampleThemeStorage);
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
  const [user, setUser] = useState<{
    id: string;
    email?: string;
    user_metadata?: {
      avatar_url?: string;
      full_name?: string;
      [key: string]: unknown;
    };
  } | null>(null);

  useEffect(() => {
    async function getUser() {
      try {
        console.log('[CHAT] Getting user...');
        // First try to get user from current session
        const {
          data: { user },
        } = await supabase.auth.getUser();
        console.log('[CHAT] getUser: User from session', user);

        if (user) {
          setUser(user);
          console.log('[CHAT] User set from session', user.email);
        } else {
          console.log('[CHAT] No user in session, trying storage');
          // If no session, try to get user from storage tokens
          const storageUser = await getCurrentUserFromStorage();
          if (storageUser) {
            setUser(storageUser);
            console.log('[CHAT] User set from storage', storageUser.email);
          } else {
            console.log('[CHAT] No user found in storage');
          }
        }
      } catch (error) {
        console.error('[CHAT] Error getting user:', error);
      } finally {
        // Complete
      }

      // Set up auth state change listener
      const {
        data: { subscription },
      } = await supabase.auth.onAuthStateChange((event, session) => {
        console.log('[CHAT] Auth state changed:', event, session?.user?.email);
        setUser(session?.user ?? null);
      });

      // Clean up subscription on unmount
      return () => {
        console.log('[CHAT] Cleaning up auth subscription');
        subscription.unsubscribe();
      };
    }

    const handleAuthComplete = (message: { action: string; payload: { success: boolean } }) => {
      console.log('[CHAT] Received message:', message);
      if (message.action === 'authComplete' && message.payload.success) {
        console.log('[CHAT] Auth complete message received, refreshing user');
        // Refresh user data
        getUser();
      }
    };

    if (chrome?.runtime?.onMessage) {
      console.log('[CHAT] Setting up message listener');
      chrome.runtime.onMessage.addListener(handleAuthComplete);

      // Initial user fetch
      console.log('[CHAT] Initial user fetch');
      getUser();

      return () => {
        console.log('[CHAT] Removing message listener');
        chrome.runtime.onMessage.removeListener(handleAuthComplete);
      };
    } else {
      console.log('[CHAT] Chrome runtime not available, fetching user directly');
      getUser();
    }
  }, [supabase]);

  const handleSignIn = async () => {
    try {
      console.log('[CHAT] Initiating sign in with GitHub');
      await signInWithProvider('github');
    } catch (error) {
      console.error('[CHAT] Error signing in:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('[CHAT] Signing out');
      await signOut();
      setUser(null);
      console.log('[CHAT] Sign out complete, user cleared');
    } catch (error) {
      console.error('[CHAT] Error signing out:', error);
    }
  };

  return (
    <div className="flex items-center justify-between p-2 border-b border-border bg-background text-foreground">
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 rounded-full bg-muted/30 px-2 py-1 hover:bg-muted/50 transition-colors cursor-pointer">
              <Avatar className="h-6 w-6">
                {user.user_metadata?.avatar_url ? (
                  <AvatarImage src={user.user_metadata.avatar_url} alt={user.email || ''} />
                ) : (
                  <AvatarFallback>
                    {user.user_metadata?.full_name ? user.user_metadata.full_name.charAt(0).toUpperCase() : '?'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="text-sm font-medium truncate max-w-[120px]">
                {user.user_metadata?.full_name || user.email || t('sidepanel_user')}
              </div>
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <a
                className="flex flex-col"
                href="https://overlay.one/en/dashboard"
                target="_blank"
                rel="noopener noreferrer">
                <span>{t('sidepanel_signed_in_as')}</span>
                <span className="font-medium">{user.email}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <div className="flex items-center gap-2 w-full">
                <LogOut className="h-3.5 w-3.5" />
                <span>{t('sidepanel_click_to_sign_out')}</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button size="sm" variant="outline" className="flex items-center gap-2" onClick={handleSignIn}>
          <img src={icon} alt="Overlay" className="w-5 h-5" />
          <span>{t('sidepanel_sign_in')}</span>
        </Button>
      )}
      <div className="flex items-center">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => exampleThemeStorage.set(isLight ? 'dark' : 'light')}
          title={isLight ? t('switch_to_dark', 'Switch to Dark Mode') : t('switch_to_light', 'Switch to Light Mode')}>
          {isLight ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => chrome.runtime.openOptionsPage()}
          title={t('settings', 'Settings')}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
