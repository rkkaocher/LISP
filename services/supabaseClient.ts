import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Attempt to get keys from environment or local storage
const getInitialConfig = () => {
  const envUrl = process.env.SUPABASE_URL || '';
  const envKey = process.env.SUPABASE_ANON_KEY || '';
  
  const savedUrl = localStorage.getItem('NX_SUPABASE_URL');
  const savedKey = localStorage.getItem('NX_SUPABASE_KEY');
  
  return {
    url: envUrl || savedUrl || '',
    key: envKey || savedKey || ''
  };
};

let config = getInitialConfig();

export const isSupabaseConfigured = () => {
  return config.url.length > 0 && config.key.length > 0 && config.url.includes('.supabase.co');
};

// Internal client instance
let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (clientInstance) return clientInstance;
  
  // Initialize with what we have
  clientInstance = createClient(
    config.url || 'https://placeholder.supabase.co',
    config.key || 'placeholder-key'
  );
  return clientInstance;
};

// Export the initial instance for compatibility
export const supabase = getSupabaseClient();

/**
 * Re-initializes the client with new credentials
 */
export const initializeSupabase = (url: string, key: string) => {
  if (!url || !key) return false;
  
  try {
    const newClient = createClient(url, key);
    clientInstance = newClient;
    config = { url, key };
    
    // Persist for convenience during development if not in environment
    if (!process.env.SUPABASE_URL) {
      localStorage.setItem('NX_SUPABASE_URL', url);
      localStorage.setItem('NX_SUPABASE_KEY', key);
    }
    return true;
  } catch (e) {
    console.error("Failed to initialize Supabase:", e);
    return false;
  }
};