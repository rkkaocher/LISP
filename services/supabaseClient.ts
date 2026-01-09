import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Attempt to get keys from environment or local storage safely
const getInitialConfig = () => {
  let envUrl = '';
  let envKey = '';
  
  try {
    // Check for process and process.env to prevent crashes
    if (typeof process !== 'undefined' && process.env) {
      envUrl = process.env.SUPABASE_URL || '';
      envKey = process.env.SUPABASE_ANON_KEY || '';
    }
  } catch (e) {
    console.warn("Environment variables not accessible directly:", e);
  }
  
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
  
  // Initialize with what we have or placeholders to prevent crash
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
    
    // Persist for convenience if not in environment
    localStorage.setItem('NX_SUPABASE_URL', url);
    localStorage.setItem('NX_SUPABASE_KEY', key);
    
    return true;
  } catch (e) {
    console.error("Failed to initialize Supabase:", e);
    return false;
  }
};