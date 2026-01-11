import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  // Directly using the keys confirmed from your screenshot
  const url = 'https://dlvyazxvxvppfrqdugrs.supabase.co';
  const key = 'sb_publishable_-IlAKT0C4SeNYiPebZL7mQ_6bvzEIMv';
  return { url, key };
};

const config = getSupabaseConfig();

export const isSupabaseConfigured = () => {
  // Support both old JWT format (eyJ) and new format (sb_publishable)
  return !!(config.url && config.key && config.url.includes('.supabase.co'));
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (clientInstance) return clientInstance;
  
  if (!config.url || !config.key) {
    throw new Error("Supabase URL or Publishable Key is missing.");
  }

  clientInstance = createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
  return clientInstance;
};

export const supabase = getSupabaseClient();