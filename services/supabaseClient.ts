
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Centralized configuration to ensure consistency across environments
const SUPABASE_URL = 'https://dlvyazxvxvppfrqdugrs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-IlAKT0C4SeNYiPebZL7mQ_6bvzEIMv';

export const isSupabaseConfigured = () => {
  return !!(SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.includes('.supabase.co'));
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (clientInstance) return clientInstance;
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase URL or Publishable Key is missing in configuration.");
  }

  clientInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'nexus-connect-auth-token'
    },
    global: {
      headers: { 'x-application-name': 'nexus-connect' },
    },
    db: {
      schema: 'public'
    }
  });
  return clientInstance;
};

export const supabase = getSupabaseClient();
