/**
 * Advanced Translation Context
 * Provides comprehensive i18n support with dynamic language switching
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { enExtended } from '../locales/en-extended';
import { arExtended } from '../locales/ar-extended';

type Language = 'en' | 'ar';
type TranslationKeys = typeof enExtended;

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  isRTL: boolean;
  formatNumber: (value: number, decimals?: number) => string;
  formatCurrency: (value: number, currency?: string) => string;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
  formatDateTime: (date: Date | string) => string;
  formatRelativeTime: (date: Date | string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const translations = {
  en: enExtended,
  ar: arExtended,
};

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load saved language preference
  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'en' || saved === 'ar')) {
      setLanguageState(saved);
      updateDocumentLanguage(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    updateDocumentLanguage(lang);
  };

  const updateDocumentLanguage = (lang: Language) => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  /**
   * Translate key with optional replacements
   * Example: t('time.minutesAgo', { count: 5 }) => "5 minutes ago"
   */
  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`);
      return key;
    }

    // Replace placeholders
    if (replacements) {
      return Object.entries(replacements).reduce((str, [placeholder, replaceValue]) => {
        return str.replace(new RegExp(`{${placeholder}}`, 'g'), String(replaceValue));
      }, value);
    }

    return value;
  };

  /**
   * Format number with thousand separators
   */
  const formatNumber = (value: number, decimals: number = 0): string => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  /**
   * Format currency value
   */
  const formatCurrency = (value: number, currency: string = 'SAR'): string => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  /**
   * Format date
   */
  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  };

  /**
   * Format time
   */
  const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  /**
   * Format date and time
   */
  const formatDateTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  const formatRelativeTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) {
      return t('time.justNow');
    } else if (minutes < 2) {
      return t('time.minuteAgo');
    } else if (minutes < 60) {
      return t('time.minutesAgo', { count: minutes });
    } else if (hours < 2) {
      return t('time.hourAgo');
    } else if (hours < 24) {
      return t('time.hoursAgo', { count: hours });
    } else if (days < 2) {
      return t('time.dayAgo');
    } else if (days < 7) {
      return t('time.daysAgo', { count: days });
    } else if (weeks < 2) {
      return t('time.weekAgo');
    } else if (weeks < 4) {
      return t('time.weeksAgo', { count: weeks });
    } else if (months < 2) {
      return t('time.monthAgo');
    } else if (months < 12) {
      return t('time.monthsAgo', { count: months });
    } else if (years < 2) {
      return t('time.yearAgo');
    } else {
      return t('time.yearsAgo', { count: years });
    }
  };

  const value: TranslationContextType = {
    language,
    setLanguage,
    t,
    isRTL: language === 'ar',
    formatNumber,
    formatCurrency,
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
}

// Hook for currency formatting
export function useCurrency() {
  const { formatCurrency, formatNumber } = useTranslation();

  return {
    format: formatCurrency,
    formatAmount: (amount: number) => formatNumber(amount, 2),
    parse: (value: string) => {
      const cleaned = value.replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    },
  };
}

// Hook for date formatting
export function useDate() {
  const { formatDate, formatTime, formatDateTime, formatRelativeTime } = useTranslation();

  return {
    format: formatDate,
    formatTime,
    formatDateTime,
    formatRelative: formatRelativeTime,
    isToday: (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const today = new Date();
      return d.toDateString() === today.toDateString();
    },
    isPast: (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d < new Date();
    },
    isFuture: (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d > new Date();
    },
  };
}
