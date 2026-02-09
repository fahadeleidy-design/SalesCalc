import type { SupportedStorage } from '@supabase/supabase-js';

const memoryStore = new Map<string, string>();

function isStorageAvailable(storage: Storage): boolean {
  try {
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const useLocalStorage = typeof window !== 'undefined' && isStorageAvailable(window.localStorage);

export class SupabaseSessionStorage implements SupportedStorage {
  getItem(key: string): string | null {
    if (useLocalStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStore.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (useLocalStorage) {
      window.localStorage.setItem(key, value);
    }
    memoryStore.set(key, value);
  }

  removeItem(key: string): void {
    if (useLocalStorage) {
      window.localStorage.removeItem(key);
    }
    memoryStore.delete(key);
  }
}

export const sessionStorageAdapter = new SupabaseSessionStorage();
