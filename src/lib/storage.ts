/**
 * Safe LocalStorage Wrapper
 *
 * Provides error handling for localStorage operations to prevent
 * crashes in private browsing, quota exceeded, or other edge cases.
 */

/**
 * Safely get an item from localStorage
 */
export function getLocalStorage(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available');
      return null;
    }

    return window.localStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading from localStorage (key: ${key}):`, error);
    return null;
  }
}

/**
 * Safely set an item in localStorage
 */
export function setLocalStorage(key: string, value: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available');
      return false;
    }

    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage (key: ${key}):`, error);

    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Consider clearing old data.');
    }

    return false;
  }
}

/**
 * Safely remove an item from localStorage
 */
export function removeLocalStorage(key: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available');
      return false;
    }

    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (key: ${key}):`, error);
    return false;
  }
}

/**
 * Safely clear all localStorage
 */
export function clearLocalStorage(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('localStorage is not available');
      return false;
    }

    window.localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

/**
 * Safely get and parse JSON from localStorage
 */
export function getLocalStorageJSON<T>(key: string, defaultValue: T): T {
  try {
    const item = getLocalStorage(key);

    if (item === null) {
      return defaultValue;
    }

    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error parsing JSON from localStorage (key: ${key}):`, error);
    return defaultValue;
  }
}

/**
 * Safely stringify and set JSON in localStorage
 */
export function setLocalStorageJSON<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value);
    return setLocalStorage(key, serialized);
  } catch (error) {
    console.error(`Error stringifying JSON for localStorage (key: ${key}):`, error);
    return false;
  }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    const testKey = '__localStorage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get localStorage usage statistics
 */
export function getLocalStorageStats(): {
  available: boolean;
  itemCount: number;
  estimatedSize: number;
} {
  try {
    if (!isLocalStorageAvailable()) {
      return { available: false, itemCount: 0, estimatedSize: 0 };
    }

    const itemCount = window.localStorage.length;
    let estimatedSize = 0;

    for (let i = 0; i < itemCount; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        const value = window.localStorage.getItem(key);
        estimatedSize += key.length + (value?.length || 0);
      }
    }

    return {
      available: true,
      itemCount,
      estimatedSize, // in characters
    };
  } catch (error) {
    console.error('Error getting localStorage stats:', error);
    return { available: false, itemCount: 0, estimatedSize: 0 };
  }
}
