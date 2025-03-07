import { useState } from 'react';
import { signInWithProvider } from '@extension/shared/lib/services/supabase';
import { t } from '@extension/i18n';

type Provider = 'google' | 'github';

export function LoginPage() {
  const [isLoading, setIsLoading] = useState<Provider | null>(null);

  const handleSignIn = async (provider: Provider) => {
    try {
      setIsLoading(provider);
      await signInWithProvider(provider);
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      <img src="/icon-128.png" alt="Overlay" className="w-16 h-16" />
      <h1 className="text-xl font-bold">{t('extensionName')}</h1>
      <p className="text-center text-muted-foreground">
        {t('popup_sign_in_description', 'Sign in to access all features')}
      </p>

      <div className="flex flex-col w-full space-y-3">
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={() => handleSignIn('google')}
          disabled={isLoading !== null}>
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {isLoading === 'google'
            ? t('popup_signing_in', 'Signing in...')
            : t('popup_sign_in_with_google', 'Sign in with Google')}
        </button>

        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={() => handleSignIn('github')}
          disabled={isLoading !== null}>
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.933.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"
              fill="currentColor"
            />
          </svg>
          {isLoading === 'github'
            ? t('popup_signing_in', 'Signing in...')
            : t('popup_sign_in_with_github', 'Sign in with GitHub')}
        </button>
      </div>
    </div>
  );
}
