import { createClient as createSupabaseClient, User } from '@supabase/supabase-js';
import type { Database, Json } from '../database.types';

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

const storageAdapterBG = {
  getItem: async (key: string) => {
    const cookie = await chrome.cookies.get({ url: 'https://overlay.one', name: key });
    return decodeURIComponent(cookie?.value || '');
  },

  setItem: async (key: string, value: string) => {
    await chrome.cookies.set({
      url: 'https://overlay.one',
      name: key,
      value: encodeURIComponent(value),
    });
  },

  removeItem: async (key: string) => {
    await chrome.cookies.remove({ url: 'https://overlay.one', name: key });
  },
};
export function createClient() {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storageAdapterBG,
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
export async function saveNote(
  user: User,
  content: string,
  source: string,
  tags?: string[],
): Promise<{ success: boolean; data: Note | null; error?: Error }> {
  console.log('[SUPABASE] Saving note:', { content, source, tags, user });
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
    return { success: false, data: null, error };
  }
  console.log('[SUPABASE] Note saved successfully:', data);
  return { success: true, data: data[0] as Note, error: undefined };
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
 * Update an existing note by ID
 * @param noteId The ID of the note to update
 * @param content The updated content
 * @param source_url The source URL where the note was taken
 * @param tags Optional tags for the note
 * @returns Success status and any error message
 */
export async function updateNote(noteId: string, content: string, source_url: string, tags?: string[]) {
  try {
    const user = await getCurrentUserFromStorage();
    if (!user) {
      console.error('[SUPABASE] Cannot update note: User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('notes')
      .update({
        content,
        source_url,
        tags: tags || [],
        updated_at: new Date().toISOString(),
        title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      })
      .eq('id', noteId)
      .eq('user_id', user.id)
      .select();

    if (error) {
      console.error('[SUPABASE] Error updating note:', error);
      return { success: false, error: error.message };
    }

    console.log('[SUPABASE] Note updated successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[SUPABASE] Error in updateNote:', error);
    return { success: false, error: (error as Error).message };
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

/**
 * Type alias for Completion objects from the database
 */
export type Completion = Database['public']['Tables']['completions']['Row'];

/**
 * Save a completion to Supabase
 * @param promptContent The prompt/question content
 * @param responseContent The response content from the LLM
 * @param sourceUrl Optional source URL where the completion occurred
 * @param modelInfo Optional information about the model used
 * @param metadata Optional additional metadata
 * @returns The saved completion data or null if there was an error
 */
export async function saveCompletion({
  promptContent,
  responseContent,
  sourceUrl = null,
  questionId = null,
  modelInfo = {},
  metadata = null,
  prompt = null,
}: {
  promptContent: string;
  responseContent: string;
  sourceUrl?: string | null;
  questionId?: string | null;
  modelInfo?: {
    modelName?: string;
    modelProvider?: string;
    modelDisplayName?: string;
  };
  metadata?: Record<string, unknown> | null;
  prompt?: Json | null;
}) {
  try {
    const user = await getCurrentUserFromStorage();
    if (!user) {
      console.error('[SUPABASE] Cannot save completion: User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    // Generate a UUID for the completion
    const completionId = crypto.randomUUID();

    // Current timestamp in milliseconds
    const now = Date.now();

    const supabase = createClient();
    const { data, error } = await supabase
      .from('completions')
      .insert({
        completion_id: completionId,
        uid: user.id,
        prompt_content: promptContent,
        response_content: responseContent,
        prompt_timestamp: now,
        response_timestamp: now,
        source_url: sourceUrl,
        question_id: questionId,
        model_name: modelInfo.modelName || null,
        model_provider: modelInfo.modelProvider || null,
        model_display_name: modelInfo.modelDisplayName || null,
        metadata,
        prompt,
      } as Database['public']['Tables']['completions']['Insert'])
      .select();

    if (error) {
      console.error('[SUPABASE] Error saving completion:', error);
      return { success: false, error: error.message };
    }

    console.log('[SUPABASE] Completion saved successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[SUPABASE] Error in saveCompletion:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get completions for the current user
 * @param options Optional parameters for filtering and pagination
 * @returns An array of completions or an error
 */
export async function getCompletions({
  limit = 50,
  offset = 0,
  sourceUrl = null,
  questionId = null,
  orderBy = { column: 'created_at', ascending: false },
}: {
  limit?: number;
  offset?: number;
  sourceUrl?: string | null;
  questionId?: string | null;
  orderBy?: { column: string; ascending: boolean };
} = {}) {
  try {
    const user = await getCurrentUserFromStorage();
    if (!user) {
      console.error('[SUPABASE] Cannot get completions: User not authenticated');
      return { success: false, error: 'User not authenticated', data: [] };
    }

    const supabase = createClient();
    let query = supabase
      .from('completions')
      .select('*')
      .eq('uid', user.id)
      .order(orderBy.column, { ascending: orderBy.ascending })
      .range(offset, offset + limit - 1);

    // Apply additional filters if provided
    if (sourceUrl) {
      query = query.eq('source_url', sourceUrl);
    }

    if (questionId) {
      query = query.eq('question_id', questionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SUPABASE] Error getting completions:', error);
      return { success: false, error: error.message, data: [] };
    }

    console.log(`[SUPABASE] Retrieved ${data.length} completions`);
    return { success: true, data: data as Completion[] };
  } catch (error) {
    console.error('[SUPABASE] Error in getCompletions:', error);
    return { success: false, error: (error as Error).message, data: [] };
  }
}

/**
 * Delete a completion by ID
 * @param completionId The ID of the completion to delete
 * @returns Success status and any error message
 */
export async function deleteCompletion(completionId: string) {
  try {
    const user = await getCurrentUserFromStorage();
    if (!user) {
      console.error('[SUPABASE] Cannot delete completion: User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    const supabase = createClient();
    const { error } = await supabase.from('completions').delete().eq('completion_id', completionId).eq('uid', user.id);

    if (error) {
      console.error('[SUPABASE] Error deleting completion:', error);
      return { success: false, error: error.message };
    }

    console.log('[SUPABASE] Completion deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('[SUPABASE] Error in deleteCompletion:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get user preferences
 * @returns User preferences with success status and any error message
 */
export async function getUserPreferences() {
  try {
    const user = await getCurrentUserFromStorage();
    if (!user) {
      console.error('[SUPABASE] Cannot get preferences: User not authenticated');
      return { success: false, error: 'User not authenticated', data: null };
    }

    const supabase = createClient();
    const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single();

    if (error) {
      // If the error is because the record wasn't found, return an empty preferences object
      if (error.code === 'PGRST116') {
        // PostgreSQL "not found" error code
        console.log('[SUPABASE] No preferences found for user, returning defaults');
        return { success: true, data: {} };
      }

      console.error('[SUPABASE] Error getting user preferences:', error);
      return { success: false, error: error.message, data: null };
    }

    console.log('[SUPABASE] Retrieved user preferences');
    return { success: true, data };
  } catch (error) {
    console.error('[SUPABASE] Error in getUserPreferences:', error);
    return { success: false, error: (error as Error).message, data: null };
  }
}

/**
 * Update user preferences
 * @param preferences The preferences to update
 * @returns Success status and updated preference data
 */
export async function updateUserPreferences(preferences: { theme?: 'light' | 'dark'; default_task_list?: string }) {
  try {
    const user = await getCurrentUserFromStorage();
    if (!user) {
      console.error('[SUPABASE] Cannot update preferences: User not authenticated');
      return { success: false, error: 'User not authenticated', data: null };
    }

    const supabase = createClient();

    // Check if the user already has preferences
    const { data: existingData, error: getError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let result;

    if (getError && getError.code === 'PGRST116') {
      // No existing preferences, insert new record
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          ...preferences,
        })
        .select();

      if (error) {
        console.error('[SUPABASE] Error inserting user preferences:', error);
        return { success: false, error: error.message, data: null };
      }

      result = data;
    } else if (!getError) {
      // Existing preferences found, update them
      const { data, error } = await supabase
        .from('user_preferences')
        .update(preferences)
        .eq('user_id', user.id)
        .select();

      if (error) {
        console.error('[SUPABASE] Error updating user preferences:', error);
        return { success: false, error: error.message, data: null };
      }

      result = data;
    } else {
      // Some other error occurred
      console.error('[SUPABASE] Error checking for existing preferences:', getError);
      return { success: false, error: getError.message, data: null };
    }

    console.log('[SUPABASE] Updated user preferences successfully:', result);

    // Update the storage as well if default_task_list was updated
    if (preferences.default_task_list !== undefined) {
      try {
        // This import is assuming there's a storageUtil.js file with this function
        const { userPreferencesStorage } = await import('@extension/storage');
        userPreferencesStorage.set({
          theme: preferences.theme,
          default_task_list: preferences.default_task_list,
        });
      } catch (storageError) {
        console.error('[SUPABASE] Error updating preferences in storage:', storageError);
        // Continue since the DB update was successful
      }
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('[SUPABASE] Error in updateUserPreferences:', error);
    return { success: false, error: (error as Error).message, data: null };
  }
}
