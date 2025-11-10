/**
 * Error Handling Hook
 *
 * Comprehensive error handling with user notifications,
 * logging, and recovery suggestions.
 */

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Error types for categorization
 */
export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'database'
  | 'business_logic'
  | 'unknown';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Enhanced error interface
 */
export interface AppError {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  code?: string;
  details?: Record<string, any>;
  recoverable: boolean;
  userMessage: string;
  technicalMessage?: string;
  timestamp: Date;
}

/**
 * Error handling options
 */
export interface ErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  logToServer?: boolean;
  customMessage?: string;
  onError?: (error: AppError) => void;
}

/**
 * Parse Supabase/Postgres errors
 */
function parsePostgrestError(error: PostgrestError): Partial<AppError> {
  const code = error.code;

  // Database constraint violations
  if (code === '23505') {
    return {
      category: 'validation',
      severity: 'medium',
      userMessage: 'This record already exists. Please check for duplicates.',
      recoverable: true,
    };
  }

  // Foreign key violations
  if (code === '23503') {
    return {
      category: 'validation',
      severity: 'medium',
      userMessage: 'Cannot perform this action due to related records.',
      recoverable: true,
    };
  }

  // Row level security violations
  if (code === '42501' || error.message.includes('row-level security')) {
    return {
      category: 'authorization',
      severity: 'high',
      userMessage: 'You do not have permission to perform this action.',
      recoverable: false,
    };
  }

  // Not found errors
  if (code === 'PGRST116') {
    return {
      category: 'database',
      severity: 'low',
      userMessage: 'The requested item was not found.',
      recoverable: true,
    };
  }

  return {
    category: 'database',
    severity: 'medium',
    userMessage: 'A database error occurred. Please try again.',
    recoverable: true,
  };
}

/**
 * Parse network errors
 */
function parseNetworkError(error: Error): Partial<AppError> {
  if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
    return {
      category: 'network',
      severity: 'high',
      userMessage: 'Network connection lost. Please check your internet connection.',
      recoverable: true,
    };
  }

  if (error.message.includes('timeout')) {
    return {
      category: 'network',
      severity: 'medium',
      userMessage: 'Request timed out. Please try again.',
      recoverable: true,
    };
  }

  return {
    category: 'unknown',
    severity: 'medium',
    userMessage: 'An unexpected error occurred. Please try again.',
    recoverable: true,
  };
}

/**
 * Parse authentication errors
 */
function parseAuthError(error: Error): Partial<AppError> {
  if (error.message.includes('Invalid login') || error.message.includes('credentials')) {
    return {
      category: 'authentication',
      severity: 'low',
      userMessage: 'Invalid email or password. Please try again.',
      recoverable: true,
    };
  }

  if (error.message.includes('session') || error.message.includes('token')) {
    return {
      category: 'authentication',
      severity: 'medium',
      userMessage: 'Your session has expired. Please log in again.',
      recoverable: true,
    };
  }

  return {
    category: 'authentication',
    severity: 'medium',
    userMessage: 'Authentication failed. Please try again.',
    recoverable: true,
  };
}

/**
 * Main error handler hook
 */
export function useErrorHandler() {
  /**
   * Parse any error into structured AppError
   */
  const parseError = useCallback((error: unknown): AppError => {
    const timestamp = new Date();

    // Default error structure
    let appError: AppError = {
      message: 'An unexpected error occurred',
      category: 'unknown',
      severity: 'medium',
      recoverable: true,
      userMessage: 'Something went wrong. Please try again.',
      timestamp,
    };

    // Handle null/undefined
    if (!error) {
      return appError;
    }

    // Handle AppError (already parsed)
    if (typeof error === 'object' && 'category' in error) {
      return error as AppError;
    }

    // Handle string errors
    if (typeof error === 'string') {
      appError.message = error;
      appError.userMessage = error;
      return appError;
    }

    // Handle Error objects
    if (error instanceof Error) {
      appError.message = error.message;
      appError.technicalMessage = error.stack;

      // Check for Postgrest errors
      if ('code' in error && 'details' in error) {
        const parsed = parsePostgrestError(error as PostgrestError);
        appError = { ...appError, ...parsed };
        appError.code = (error as PostgrestError).code;
      }
      // Check for network errors
      else if (error.message.includes('fetch') || error.message.includes('Network')) {
        const parsed = parseNetworkError(error);
        appError = { ...appError, ...parsed };
      }
      // Check for auth errors
      else if (error.message.includes('auth') || error.message.includes('login')) {
        const parsed = parseAuthError(error);
        appError = { ...appError, ...parsed };
      }
    }

    return appError;
  }, []);

  /**
   * Handle error with options
   */
  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const {
        showToast = true,
        logToConsole = true,
        logToServer = false,
        customMessage,
        onError,
      } = options;

      const appError = parseError(error);

      // Use custom message if provided
      if (customMessage) {
        appError.userMessage = customMessage;
      }

      // Log to console
      if (logToConsole) {
        console.error('[Error Handler]', {
          category: appError.category,
          severity: appError.severity,
          message: appError.message,
          technical: appError.technicalMessage,
          timestamp: appError.timestamp,
        });
      }

      // Show toast notification
      if (showToast) {
        const toastOptions = {
          duration: appError.severity === 'critical' ? 6000 : 4000,
          icon: getIconForSeverity(appError.severity),
        };

        if (appError.severity === 'critical' || appError.severity === 'high') {
          toast.error(appError.userMessage, toastOptions);
        } else if (appError.severity === 'medium') {
          toast.error(appError.userMessage, toastOptions);
        } else {
          toast(appError.userMessage, toastOptions);
        }
      }

      // Log to server (future enhancement)
      if (logToServer) {
        // TODO: Send to error logging service
        console.info('[Error Handler] Would log to server:', appError);
      }

      // Call custom error handler
      if (onError) {
        onError(appError);
      }

      return appError;
    },
    [parseError]
  );

  /**
   * Handle async operations with error handling
   */
  const withErrorHandler = useCallback(
    <T,>(
      asyncFn: () => Promise<T>,
      options: ErrorHandlerOptions = {}
    ): Promise<T | null> => {
      return asyncFn().catch((error) => {
        handleError(error, options);
        return null;
      });
    },
    [handleError]
  );

  /**
   * Create error boundary fallback
   */
  const createErrorFallback = useCallback(
    (error: Error, resetError: () => void) => {
      const appError = parseError(error);

      return {
        error: appError,
        reset: resetError,
        message: appError.userMessage,
        canRetry: appError.recoverable,
      };
    },
    [parseError]
  );

  return {
    handleError,
    parseError,
    withErrorHandler,
    createErrorFallback,
  };
}

/**
 * Get icon for error severity
 */
function getIconForSeverity(severity: ErrorSeverity): string {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'high':
      return '❌';
    case 'medium':
      return '⚠️';
    case 'low':
      return 'ℹ️';
    default:
      return '⚠️';
  }
}

/**
 * Error boundary helper
 */
export function logErrorToService(error: Error, errorInfo: { componentStack: string }) {
  // Log to error tracking service (e.g., Sentry)
  console.error('[Error Boundary]', {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString(),
  });
}
