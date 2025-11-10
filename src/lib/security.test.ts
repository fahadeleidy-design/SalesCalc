import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeHtml,
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateUrl,
  escapeHtml,
  validateLength,
  hasSuspiciousPatterns,
  sanitizeFilename,
  sanitizeQuotationNumber,
  sanitizeSku,
  sanitizeCompanyName,
  meetsCSP,
  rateLimiter,
} from './security';

describe('sanitizeHtml', () => {
  it('should convert HTML to text', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('should handle empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('should preserve safe text', () => {
    const input = 'Hello World';
    expect(sanitizeHtml(input)).toBe('Hello World');
  });
});

describe('sanitizeInput', () => {
  it('should trim whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('should remove dangerous characters', () => {
    const input = 'hello<script>world';
    const result = sanitizeInput(input);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('should limit length', () => {
    const longInput = 'a'.repeat(20000);
    const result = sanitizeInput(longInput);
    expect(result.length).toBeLessThanOrEqual(10000);
  });

  it('should handle empty input', () => {
    expect(sanitizeInput('')).toBe('');
  });
});

describe('validateEmail', () => {
  it('should validate correct emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });

  it('should handle empty input', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('should reject emails that are too long', () => {
    const longEmail = 'a'.repeat(250) + '@example.com';
    expect(validateEmail(longEmail)).toBe(false);
  });
});

describe('validatePhone', () => {
  it('should validate correct phone numbers', () => {
    expect(validatePhone('1234567890')).toBe(true);
    expect(validatePhone('+1 (555) 123-4567')).toBe(true);
    expect(validatePhone('+966 50 123 4567')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validatePhone('123')).toBe(false); // Too short
    expect(validatePhone('abc')).toBe(false); // Letters
    expect(validatePhone('123456789012345678901')).toBe(false); // Too long
  });

  it('should handle empty input', () => {
    expect(validatePhone('')).toBe(false);
  });
});

describe('validateUrl', () => {
  it('should validate correct URLs', () => {
    expect(validateUrl('https://example.com')).toBe(true);
    expect(validateUrl('http://example.com')).toBe(true);
    expect(validateUrl('https://example.com/path?query=1')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(validateUrl('not-a-url')).toBe(false);
    expect(validateUrl('ftp://example.com')).toBe(false); // Wrong protocol
    expect(validateUrl('javascript:alert(1)')).toBe(false);
  });

  it('should handle empty input', () => {
    expect(validateUrl('')).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
    expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
    expect(escapeHtml("'test'")).toBe('&#x27;test&#x27;');
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('should handle empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should handle normal text', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});

describe('validateLength', () => {
  it('should validate length within range', () => {
    expect(validateLength('hello', 1, 10)).toBe(true);
    expect(validateLength('test', 4, 4)).toBe(true);
  });

  it('should reject strings too short', () => {
    expect(validateLength('hi', 5, 10)).toBe(false);
  });

  it('should reject strings too long', () => {
    expect(validateLength('hello world', 1, 5)).toBe(false);
  });

  it('should handle empty strings', () => {
    expect(validateLength('', 0, 10)).toBe(true);
    expect(validateLength('', 1, 10)).toBe(false);
  });
});

describe('hasSuspiciousPatterns', () => {
  it('should detect script tags', () => {
    expect(hasSuspiciousPatterns('<script>alert(1)</script>')).toBe(true);
  });

  it('should detect javascript: protocol', () => {
    expect(hasSuspiciousPatterns('javascript:alert(1)')).toBe(true);
  });

  it('should detect event handlers', () => {
    expect(hasSuspiciousPatterns('<div onclick="alert(1)">')).toBe(true);
    expect(hasSuspiciousPatterns('onerror=alert(1)')).toBe(true);
  });

  it('should detect iframes', () => {
    expect(hasSuspiciousPatterns('<iframe src="evil.com">')).toBe(true);
  });

  it('should allow safe content', () => {
    expect(hasSuspiciousPatterns('Hello World')).toBe(false);
    expect(hasSuspiciousPatterns('<div>Safe content</div>')).toBe(false);
  });

  it('should handle empty input', () => {
    expect(hasSuspiciousPatterns('')).toBe(false);
  });
});

describe('sanitizeFilename', () => {
  it('should sanitize filenames', () => {
    expect(sanitizeFilename('file name.pdf')).toBe('file_name.pdf');
    // Slashes are replaced with underscores, dots preserved
    expect(sanitizeFilename('../../etc/passwd')).toBe('.._.._etc_passwd');
  });

  it('should handle empty input', () => {
    expect(sanitizeFilename('')).toBe('unnamed');
  });

  it('should limit length', () => {
    const longName = 'a'.repeat(300) + '.pdf';
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(255);
  });

  it('should preserve file extensions', () => {
    expect(sanitizeFilename('document.pdf')).toContain('.pdf');
    expect(sanitizeFilename('image.png')).toContain('.png');
  });
});

describe('sanitizeQuotationNumber', () => {
  it('should format quotation numbers', () => {
    expect(sanitizeQuotationNumber('Q-2024-001')).toBe('Q-2024-001');
    expect(sanitizeQuotationNumber('q-2024-001')).toBe('Q-2024-001'); // Uppercase
  });

  it('should remove special characters', () => {
    expect(sanitizeQuotationNumber('Q@2024!001')).toBe('Q2024001');
  });

  it('should handle empty input', () => {
    expect(sanitizeQuotationNumber('')).toBe('');
  });

  it('should limit length', () => {
    const longNumber = 'Q'.repeat(100);
    const result = sanitizeQuotationNumber(longNumber);
    expect(result.length).toBeLessThanOrEqual(50);
  });
});

describe('sanitizeSku', () => {
  it('should format SKUs', () => {
    expect(sanitizeSku('SKU-001')).toBe('SKU-001');
    expect(sanitizeSku('sku-001')).toBe('SKU-001'); // Uppercase
  });

  it('should remove special characters', () => {
    expect(sanitizeSku('SKU@001!')).toBe('SKU001');
  });
});

describe('sanitizeCompanyName', () => {
  it('should preserve company names', () => {
    expect(sanitizeCompanyName('Acme Corp.')).toBe('Acme Corp.');
    expect(sanitizeCompanyName('Smith & Jones LLC')).toBe('Smith & Jones LLC');
  });

  it('should remove dangerous characters', () => {
    expect(sanitizeCompanyName('Acme<script>Corp')).toBe('AcmescriptCorp');
  });

  it('should limit length', () => {
    const longName = 'A'.repeat(300);
    const result = sanitizeCompanyName(longName);
    expect(result.length).toBeLessThanOrEqual(200);
  });
});

describe('meetsCSP', () => {
  it('should validate script content', () => {
    expect(meetsCSP('console.log("hello")', 'script')).toBe(true);
    expect(meetsCSP('<script>alert(1)</script>', 'script')).toBe(false);
  });

  it('should validate style content', () => {
    expect(meetsCSP('color: red;', 'style')).toBe(true);
    expect(meetsCSP('javascript:alert(1)', 'style')).toBe(false);
  });

  it('should validate image sources', () => {
    expect(meetsCSP('https://example.com/image.png', 'img')).toBe(true);
    expect(meetsCSP('data:image/png;base64,...', 'img')).toBe(true);
    expect(meetsCSP('javascript:alert(1)', 'img')).toBe(false);
  });
});

describe('rateLimiter', () => {
  beforeEach(() => {
    rateLimiter.clearAll();
  });

  it('should allow requests within limit', () => {
    expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
    expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
    expect(rateLimiter.isAllowed('user1', 5, 60000)).toBe(true);
  });

  it('should block requests over limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.isAllowed('user2', 5, 60000)).toBe(true);
    }
    expect(rateLimiter.isAllowed('user2', 5, 60000)).toBe(false);
  });

  it('should reset limits', () => {
    for (let i = 0; i < 5; i++) {
      rateLimiter.isAllowed('user3', 5, 60000);
    }
    expect(rateLimiter.isAllowed('user3', 5, 60000)).toBe(false);

    rateLimiter.reset('user3');
    expect(rateLimiter.isAllowed('user3', 5, 60000)).toBe(true);
  });

  it('should separate limits by key', () => {
    for (let i = 0; i < 5; i++) {
      rateLimiter.isAllowed('user4', 5, 60000);
    }
    expect(rateLimiter.isAllowed('user4', 5, 60000)).toBe(false);
    expect(rateLimiter.isAllowed('user5', 5, 60000)).toBe(true);
  });
});

describe('Real-world Security Scenarios', () => {
  it('should prevent XSS in quotation titles', () => {
    const maliciousTitle = '<script>alert("xss")</script>Quotation';
    const safe = sanitizeInput(maliciousTitle);
    expect(safe).not.toContain('<script>');
  });

  it('should validate customer emails', () => {
    expect(validateEmail('customer@example.com')).toBe(true);
    expect(validateEmail('not-an-email')).toBe(false);
  });

  it('should sanitize product SKUs', () => {
    const sku = sanitizeSku('widget-001');
    expect(sku).toBe('WIDGET-001');
    expect(sku).toMatch(/^[A-Z0-9\-_]+$/);
  });

  it('should validate file uploads', () => {
    const filename = sanitizeFilename('../../malicious.exe');
    expect(filename).not.toContain('../');
  });

  it('should rate limit API calls', () => {
    const userId = 'test-user';
    let allowed = true;

    for (let i = 0; i < 10; i++) {
      allowed = rateLimiter.isAllowed(userId, 5, 1000);
      if (!allowed) break;
    }

    expect(allowed).toBe(false);
  });
});
