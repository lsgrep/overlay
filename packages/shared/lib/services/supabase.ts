import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

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

/**
 * Type alias for Note objects from the database
 */
export type Note = Database['public']['Tables']['notes']['Row'];

/**
 * Save a note to Supabase
 * @param content The note content
 * @param source The source URL where the note was taken
 * @param tags Optional tags for the note
 * @returns The saved note data or null if there was an error
 */
export async function saveNote(content: string, source: string, tags?: string[]) {
  try {
    const user = await getCurrentUserFromStorage();
    if (!user) {
      console.error('[SUPABASE] Cannot save note: User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('notes')
      .insert([
        {
          user_id: user.id,
          content,
          source_url: source,
          tags: tags || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          is_archived: false,
          is_favorite: false,
          metadata: null,
        } as Database['public']['Tables']['notes']['Insert'],
      ])
      .select();

    if (error) {
      console.error('[SUPABASE] Error saving note:', error);
      return { success: false, error: error.message };
    }

    console.log('[SUPABASE] Note saved successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[SUPABASE] Error in saveNote:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get all notes for the current user
 * @param limit Optional limit on the number of notes to retrieve
 * @param offset Optional offset for pagination
 * @returns An array of notes or an error
 */
export async function getNotes(limit = 50, offset = 0) {
  try {
    const user = await getCurrentUserFromStorage();
    if (!user) {
      console.error('[SUPABASE] Cannot get notes: User not authenticated');
      return { success: false, error: 'User not authenticated', data: [] };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[SUPABASE] Error getting notes:', error);
      return { success: false, error: error.message, data: [] };
    }

    console.log(`[SUPABASE] Retrieved ${data.length} notes`);
    return { success: true, data: data as Note[] };
  } catch (error) {
    console.error('[SUPABASE] Error in getNotes:', error);
    return { success: false, error: (error as Error).message, data: [] };
  }
}

/**
 * Delete a note by ID
 * @param noteId The ID of the note to delete
 * @returns Success status and any error message
 */
export async function deleteNote(noteId: string) {
  try {
    const user = await getCurrentUserFromStorage();
    if (!user) {
      console.error('[SUPABASE] Cannot delete note: User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = createClient();
    const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('user_id', user.id);

    if (error) {
      console.error('[SUPABASE] Error deleting note:', error);
      return { success: false, error: error.message };
    }

    console.log('[SUPABASE] Note deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('[SUPABASE] Error in deleteNote:', error);
    return { success: false, error: (error as Error).message };
  }
}
