import { createBrowserClient } from '@supabase/ssr';
// import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from '@extension/env';

const NEXT_PUBLIC_SUPABASE_URL = 'https://qwmoocakwkzdifssijdh.supabase.co';
const NEXT_PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bW9vY2Frd2t6ZGlmc3NpamRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4MTIyMzksImV4cCI6MjA1NjM4ODIzOX0.5QDc2L_i9I5PGAG6aWuy5VHdwpHjqrInsrUv6BgJzGc';

// To fetch items from storage
export const getLocalStorage = async (key: string): Promise<any> => (await chrome.storage.local.get(key))[key];

// To remove storage key from the chrome storage
export const removeLocalStorage = async (key: string): Promise<void> => await chrome.storage.local.remove(key);

// For setting storage
export const setLocalStorage = async (dataObject: any): Promise<void> => await chrome.storage.local.set(dataObject);

const storageAdapter = {
  getItem: async (name: string) => {
    return await getLocalStorage(name);
  },

  setItem: async (name: string, value: string) => {
    return await setLocalStorage({ [name]: value });
  },

  removeItem: async (name: string) => {
    return await removeLocalStorage(name);
  },
};

const options = {
  auth: {
    debug: true,
    persistSession: true,
    storage: storageAdapter,
  },
};

export function createClient() {
  // Create a supabase client on the browser with project's credentials
  return createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
}
