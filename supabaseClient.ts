import { createClient } from '@supabase/supabase-js';

// Vercel-এ আপনি যে নাম দিয়েছেন সেটিই এখানে ব্যবহার করছি
const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
