import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
  define: {
    // Hardcoding the provided credentials for the user as requested
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.SUPABASE_URL': JSON.stringify('https://dlvyazxvxvppfrqdugrs.supabase.co'),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify('sb_publishable_-IlAKT0C4SeNYiPebZL7mQ_6bvzEIMv'),
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify('v18.0.0'),
    'process.env': JSON.stringify({
      API_KEY: process.env.API_KEY || '',
      SUPABASE_URL: 'https://dlvyazxvxvppfrqdugrs.supabase.co',
      SUPABASE_ANON_KEY: 'sb_publishable_-IlAKT0C4SeNYiPebZL7mQ_6bvzEIMv'
    })
  }
});