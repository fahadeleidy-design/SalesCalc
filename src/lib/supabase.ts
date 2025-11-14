import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { sessionStorageAdapter } from './sessionStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Supabase client configured with sessionStorage instead of localStorage
 * This allows multiple users to be logged in simultaneously on different tabs
 * Each tab maintains its own independent authentication session
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorageAdapter,
    storageKey: 'supabase-session',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});
