/**
 * Security Utilities
 *
 * Provides XSS prevention, input sanitization, and security hardening
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes dangerous tags and attributes
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.textContent = input;

  return temp.innerHTML;
}

/**
 * Sanitize user input for database storage
 * Trims whitespace and removes dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .substring(0, 10000); // Limit length to prevent DoS
}

/**
 * Sanitize SQL-like input (though Supabase handles this)
 * Additional layer of protection
 */
export function sanitizeSql(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/['";\\]/g, '') // Remove SQL injection characters
    .substring(0, 1000);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;

  // Allow digits, spaces, dashes, parentheses, plus sign
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(phone) && phone.length >= 10 && phone.length <= 20;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Escape special characters for safe display
 */
export function escapeHtml(text: string): string {
  if (!text) return '';

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Validate string length
 */
export function validateLength(
  input: string,
  min: number = 0,
  max: number = 1000
): boolean {
  if (!input) return min === 0;

  return input.length >= min && input.length <= max;
}

/**
 * Check for suspicious patterns that might indicate an attack
 */
export function hasSuspiciousPatterns(input: string): boolean {
  if (!input) return false;

  const suspiciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // event handlers like onclick=
    /data:text\/html/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed';

  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe characters
    .replace(/_{2,}/g, '_') // Remove consecutive underscores
    .substring(0, 255); // Limit length
}

/**
 * Generate a secure random ID
 */
export function generateSecureId(length: number = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Sanitize object for safe JSON storage
 * Removes functions and circular references
 */
export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  try {
    // JSON.parse(JSON.stringify()) removes functions and handles circular refs
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

/**
 * Validate and sanitize a quotation number
 */
export function sanitizeQuotationNumber(input: string): string {
  if (!input) return '';

  // Allow letters, numbers, dashes, underscores
  return input
    .trim()
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .toUpperCase()
    .substring(0, 50);
}

/**
 * Validate SKU format
 */
export function sanitizeSku(input: string): string {
  if (!input) return '';

  // Allow letters, numbers, dashes, underscores
  return input
    .trim()
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .toUpperCase()
    .substring(0, 50);
}

/**
 * Validate company name
 */
export function sanitizeCompanyName(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove dangerous characters
    .substring(0, 200);
}

/**
 * Content Security Policy helper
 * Check if content meets CSP requirements
 */
export function meetsCSP(content: string, type: 'script' | 'style' | 'img'): boolean {
  if (!content) return true;

  switch (type) {
    case 'script':
      // No inline scripts allowed
      return !/<script/gi.test(content);
    case 'style':
      // Check for potentially dangerous CSS
      return !/javascript:|expression\(/gi.test(content);
    case 'img':
      // Validate image src
      return /^(https?:\/\/|data:image\/)/i.test(content);
    default:
      return true;
  }
}

/**
 * Rate limiting helper
 * Tracks actions to prevent abuse
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter((time) => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      return false;
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);

    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  clearAll(): void {
    this.attempts.clear();
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Prevent timing attacks when comparing sensitive strings
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
