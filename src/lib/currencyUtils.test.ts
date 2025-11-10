import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyCompact, CURRENCY_SYMBOL, CURRENCY_CODE } from './currencyUtils';

describe('formatCurrency', () => {
  it('should format positive amounts correctly', () => {
    const result = formatCurrency(1000);
    expect(result).toContain('1,000');
    expect(result).toContain('SAR');
  });

  it('should format amounts with 2 decimal places', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1,234.56');
  });

  it('should format zero correctly', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0.00');
  });

  it('should format negative amounts correctly', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('500');
  });

  it('should round to 2 decimal places', () => {
    const result = formatCurrency(99.999);
    expect(result).toContain('100.00');
  });

  it('should format large numbers with thousands separators', () => {
    const result = formatCurrency(1234567.89);
    expect(result).toContain('1,234,567.89');
  });

  it('should handle very small decimals', () => {
    const result = formatCurrency(0.01);
    expect(result).toContain('0.01');
  });
});

describe('formatCurrencyCompact', () => {
  it('should format without decimal places', () => {
    const result = formatCurrencyCompact(1234.56);
    expect(result).toContain('1,235'); // Rounded
    expect(result).not.toContain('.56');
  });

  it('should format large amounts compactly', () => {
    const result = formatCurrencyCompact(1000000);
    expect(result).toContain('1,000,000');
  });

  it('should round to nearest integer', () => {
    expect(formatCurrencyCompact(99.4)).toContain('99');
    expect(formatCurrencyCompact(99.6)).toContain('100');
  });

  it('should handle zero', () => {
    const result = formatCurrencyCompact(0);
    expect(result).toContain('0');
  });
});

describe('Currency Constants', () => {
  it('should export correct currency symbol', () => {
    expect(CURRENCY_SYMBOL).toBe('SAR');
  });

  it('should export correct currency code', () => {
    expect(CURRENCY_CODE).toBe('SAR');
  });
});

describe('Real-world Scenarios', () => {
  it('should format quotation totals correctly', () => {
    const items = [
      { quantity: 5, unitPrice: 99.99, discount: 10 },
      { quantity: 2, unitPrice: 150.00, discount: 0 },
    ];

    const subtotal = items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discountAmount = (lineTotal * item.discount) / 100;
      return sum + (lineTotal - discountAmount);
    }, 0);

    const formatted = formatCurrency(subtotal);
    expect(formatted).toBeTruthy();
    expect(formatted).toContain('SAR');
  });

  it('should format commission amounts', () => {
    const salesAmount = 120000;
    const commissionRate = 5;
    const commissionAmount = (salesAmount * commissionRate) / 100;

    const formatted = formatCurrency(commissionAmount);
    expect(formatted).toContain('6,000');
  });

  it('should format dashboard stats compactly', () => {
    const totalRevenue = 1234567.89;
    const formatted = formatCurrencyCompact(totalRevenue);

    expect(formatted).toContain('1,234,568'); // Rounded
    expect(formatted).not.toContain('.');
  });
});
