import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Replace with your Supabase project URL and anon key
const supabaseUrl = 'https://qwmoocakwkzdifssijdh.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bW9vY2Frd2t6ZGlmc3NpamRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4MTIyMzksImV4cCI6MjA1NjM4ODIzOX0.5QDc2L_i9I5PGAG6aWuy5VHdwpHjqrInsrUv6BgJzGc';

// Storage keys for tokens (matching the ones in background script)
export const chromeStorageKeys = {
  supabaseAccessToken: 'supabaseAccessToken',
  supabaseRefreshToken: 'supabaseRefreshToken',
};

// Create a singleton Supabase client
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

/**
 * Get the current user from Chrome storage using access and refresh tokens
 */
export async function getCurrentUserFromStorage() {
  try {
    console.log('[SUPABASE] Getting user from storage');
    const accessToken = await getLocalStorage(chromeStorageKeys.supabaseAccessToken);
    const refreshToken = await getLocalStorage(chromeStorageKeys.supabaseRefreshToken);

    console.log('[SUPABASE] Retrieved tokens from storage:', {
      accessToken: accessToken ? `Found (length: ${accessToken.length})` : 'Not found',
      refreshToken: refreshToken ? `Found (length: ${refreshToken.length})` : 'Not found',
    });

    if (!accessToken || !refreshToken) {
      console.log('[SUPABASE] No tokens found in storage');
      return null;
    }

    const supabase = createClient();
    console.log('[SUPABASE] Setting session with tokens');

    // Set the session from the stored tokens
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error('[SUPABASE] Error setting session from storage:', error);
      // Clear invalid tokens
      await clearTokens();
      return null;
    }

    console.log('[SUPABASE] Session set successfully, user:', data.user?.email);
    return data.user;
  } catch (error) {
    console.error('[SUPABASE] Error getting user from storage:', error);
    return null;
  }
}

/**
 * Sign in with a provider (Google, GitHub, etc.)
 */
export async function signInWithProvider(provider: 'google' | 'github') {
  const supabase = createClient();

  // Generate the sign-in URL with redirect to chrome extension
  const redirectTo = chrome.identity.getRedirectURL();
  console.log('Redirect URL:', redirectTo);

  // Log the provider being used
  console.log('Signing in with provider:', provider);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error('Error signing in with provider:', error);
    throw error;
  }

  console.log('OAuth response data:', data);

  if (!data.url) {
    console.error('No URL returned from signInWithOAuth');
    throw new Error('No URL returned from signInWithOAuth');
  }

  console.log('Auth URL from Supabase:', data.url);

  // Parse the URL to understand its structure
  try {
    const authUrl = new URL(data.url);
    console.log('Auth URL parsed:', {
      origin: authUrl.origin,
      pathname: authUrl.pathname,
      searchParams: Object.fromEntries(authUrl.searchParams.entries()),
    });
  } catch (e) {
    console.error('Error parsing auth URL:', e);
  }

  // Tell background service worker to create a new tab with the auth URL
  chrome.runtime.sendMessage({
    action: 'signInWithProvider',
    payload: { url: data.url },
  });

  console.log('Message sent to background script to open auth URL');
}

/**
 * Sign out the current user and clear tokens
 */
export async function signOut() {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
    await clearTokens();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Clear stored tokens
 */
async function clearTokens() {
  await chrome.storage.local.remove([chromeStorageKeys.supabaseAccessToken, chromeStorageKeys.supabaseRefreshToken]);
}

/**
 * Get a value from Chrome local storage
 */
async function getLocalStorage(key: string): Promise<string | null> {
  return new Promise(resolve => {
    chrome.storage.local.get([key], result => {
      resolve(result[key] || null);
    });
  });
}
