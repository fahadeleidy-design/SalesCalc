/**
 * Custom Storage Adapter for Supabase
 * Uses sessionStorage instead of localStorage to enable multi-tab sessions
 * Each tab maintains its own independent authentication session
 */

import type { SupportedStorage } from '@supabase/supabase-js';

export class SupabaseSessionStorage implements SupportedStorage {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.sessionStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.sessionStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.sessionStorage.removeItem(key);
  }
}

export const sessionStorageAdapter = new SupabaseSessionStorage();
