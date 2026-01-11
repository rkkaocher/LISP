import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get credentials from injected process.env or fallback to provided strings
const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL || 'https://dlvyazxvxvppfrqdugrs.supabase.co';
  const key = process.env.SUPABASE_ANON_KEY || 'sb_publishable_-IlAKT0C4SeNYiPebZL7mQ_6bvzEIMv';
  return { url, key };
};

const config = getSupabaseConfig();

export const isSupabaseConfigured = () => {
  return config.url.includes('.supabase.co') && config.key.length > 5;
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (clientInstance) return clientInstance;
  
  clientInstance = createClient(config.url, config.key);
  return clientInstance;
};

// Export the singleton instance
export const supabase = getSupabaseClient();

/**
 * Allows manual re-initialization if needed
 */
export const initializeSupabase = (url: string, key: string) => {
  if (!url || !key) return false;
  try {
    clientInstance = createClient(url, key);
    localStorage.setItem('NX_SUPABASE_URL', url);
    localStorage.setItem('NX_SUPABASE_KEY', key);
    return true;
  } catch (e) {
    console.error("Supabase Init Error:", e);
    return false;
  }
};