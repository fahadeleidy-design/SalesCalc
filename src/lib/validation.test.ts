import { describe, it, expect } from 'vitest';
import {
  safeParseNumber,
  validatePrice,
  validateQuantity,
  validatePercentage,
  validateDiscount,
  validateTaxRate,
  validateCommissionRate,
  validateTarget,
  safeFormatNumber,
  isValidNumber,
} from './validation';

describe('safeParseNumber', () => {
  it('should parse valid number strings', () => {
    expect(safeParseNumber('42')).toBe(42);
    expect(safeParseNumber('3.14')).toBe(3.14);
    expect(safeParseNumber('100.50')).toBe(100.50);
  });

  it('should parse valid numbers', () => {
    expect(safeParseNumber(42)).toBe(42);
    expect(safeParseNumber(3.14)).toBe(3.14);
  });

  it('should return default value for empty input', () => {
    expect(safeParseNumber('')).toBe(0);
    expect(safeParseNumber('', { defaultValue: 10 })).toBe(10);
  });

  it('should return default value for NaN', () => {
    expect(safeParseNumber('abc')).toBe(0);
    // '12.34.56' parses as 12.34 (parseFloat stops at invalid character)
    expect(safeParseNumber('12.34.56')).toBe(12.34);
    expect(safeParseNumber('not-a-number', { defaultValue: 5 })).toBe(5);
  });

  it('should return default value for Infinity', () => {
    expect(safeParseNumber(Infinity)).toBe(0);
    expect(safeParseNumber(-Infinity)).toBe(0);
  });

  it('should clamp to minimum value', () => {
    expect(safeParseNumber(-10, { min: 0 })).toBe(0);
    expect(safeParseNumber('-50', { min: 0 })).toBe(0);
    expect(safeParseNumber(5, { min: 10 })).toBe(10);
  });

  it('should clamp to maximum value', () => {
    expect(safeParseNumber(150, { max: 100 })).toBe(100);
    expect(safeParseNumber('200', { max: 100 })).toBe(100);
  });

  it('should handle decimals correctly', () => {
    expect(safeParseNumber('12.99', { allowDecimals: true })).toBe(12.99);
    expect(safeParseNumber('12.99', { allowDecimals: false })).toBe(12);
  });

  it('should apply min, max and default together', () => {
    expect(safeParseNumber('', { min: 10, max: 100, defaultValue: 50 })).toBe(50);
    expect(safeParseNumber('5', { min: 10, max: 100, defaultValue: 50 })).toBe(10);
    expect(safeParseNumber('150', { min: 10, max: 100, defaultValue: 50 })).toBe(100);
  });
});

describe('validatePrice', () => {
  it('should validate positive prices', () => {
    expect(validatePrice(100)).toBe(100);
    expect(validatePrice('50.99')).toBe(50.99);
  });

  it('should convert negative prices to 0', () => {
    expect(validatePrice(-50)).toBe(0);
    expect(validatePrice('-100')).toBe(0);
  });

  it('should handle invalid input', () => {
    expect(validatePrice('abc')).toBe(0);
    expect(validatePrice('')).toBe(0);
  });

  it('should preserve decimal precision', () => {
    expect(validatePrice('99.99')).toBe(99.99);
    expect(validatePrice(12.345)).toBe(12.345);
  });
});

describe('validateQuantity', () => {
  it('should validate positive quantities', () => {
    expect(validateQuantity(5)).toBe(5);
    expect(validateQuantity('10.5')).toBe(10.5);
  });

  it('should convert negative quantities to 0', () => {
    expect(validateQuantity(-5)).toBe(0);
    expect(validateQuantity('-10')).toBe(0);
  });

  it('should default to 1 for empty input', () => {
    expect(validateQuantity('')).toBe(1);
  });

  it('should handle invalid input', () => {
    expect(validateQuantity('abc')).toBe(1);
  });
});

describe('validatePercentage', () => {
  it('should validate percentages in range 0-100', () => {
    expect(validatePercentage(50)).toBe(50);
    expect(validatePercentage('75.5')).toBe(75.5);
    expect(validatePercentage(0)).toBe(0);
    expect(validatePercentage(100)).toBe(100);
  });

  it('should clamp percentages above 100', () => {
    expect(validatePercentage(150)).toBe(100);
    expect(validatePercentage('200')).toBe(100);
  });

  it('should clamp negative percentages to 0', () => {
    expect(validatePercentage(-10)).toBe(0);
    expect(validatePercentage('-50')).toBe(0);
  });

  it('should handle invalid input', () => {
    expect(validatePercentage('abc')).toBe(0);
    expect(validatePercentage('')).toBe(0);
  });
});

describe('validateDiscount', () => {
  it('should validate discount percentages', () => {
    expect(validateDiscount(10)).toBe(10);
    expect(validateDiscount('25')).toBe(25);
  });

  it('should not allow discounts over 100%', () => {
    expect(validateDiscount(150)).toBe(100);
  });

  it('should not allow negative discounts', () => {
    expect(validateDiscount(-10)).toBe(0);
  });
});

describe('validateTaxRate', () => {
  it('should validate tax rates', () => {
    expect(validateTaxRate(15)).toBe(15);
    expect(validateTaxRate('5')).toBe(5);
  });

  it('should clamp tax rates to 0-100', () => {
    expect(validateTaxRate(-5)).toBe(0);
    expect(validateTaxRate(150)).toBe(100);
  });
});

describe('validateCommissionRate', () => {
  it('should validate commission rates', () => {
    expect(validateCommissionRate(5)).toBe(5);
    expect(validateCommissionRate('10.5')).toBe(10.5);
  });

  it('should clamp commission rates to 0-100', () => {
    expect(validateCommissionRate(-5)).toBe(0);
    expect(validateCommissionRate(150)).toBe(100);
  });
});

describe('validateTarget', () => {
  it('should validate positive targets', () => {
    expect(validateTarget(100000)).toBe(100000);
    expect(validateTarget('50000.50')).toBe(50000.50);
  });

  it('should not allow negative targets', () => {
    expect(validateTarget(-10000)).toBe(0);
  });

  it('should handle empty input', () => {
    expect(validateTarget('')).toBe(0);
  });
});

describe('safeFormatNumber', () => {
  it('should format valid numbers', () => {
    expect(safeFormatNumber(42)).toBe('42.00');
    expect(safeFormatNumber(3.14159, 3)).toBe('3.142');
    expect(safeFormatNumber('100.5')).toBe('100.50');
  });

  it('should return 0 for invalid input', () => {
    expect(safeFormatNumber('abc')).toBe('0');
    expect(safeFormatNumber(null)).toBe('0');
    expect(safeFormatNumber(undefined)).toBe('0');
    expect(safeFormatNumber('')).toBe('0');
  });

  it('should handle different decimal places', () => {
    expect(safeFormatNumber(3.14159, 0)).toBe('3');
    expect(safeFormatNumber(3.14159, 4)).toBe('3.1416');
  });
});

describe('isValidNumber', () => {
  it('should return true for valid numbers', () => {
    expect(isValidNumber(42)).toBe(true);
    expect(isValidNumber('3.14')).toBe(true);
    expect(isValidNumber(0)).toBe(true);
    expect(isValidNumber(-10)).toBe(true);
  });

  it('should return false for invalid input', () => {
    expect(isValidNumber('abc')).toBe(false);
    expect(isValidNumber('')).toBe(false);
    expect(isValidNumber(null)).toBe(false);
    expect(isValidNumber(undefined)).toBe(false);
    expect(isValidNumber(NaN)).toBe(false);
    expect(isValidNumber(Infinity)).toBe(false);
  });
});

describe('Edge Cases', () => {
  it('should handle very large numbers', () => {
    expect(validatePrice(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('should handle very small decimals', () => {
    expect(validatePrice(0.0001)).toBe(0.0001);
  });

  it('should handle scientific notation', () => {
    expect(safeParseNumber('1e5')).toBe(100000);
    expect(safeParseNumber('1.5e2')).toBe(150);
  });

  it('should handle leading/trailing whitespace', () => {
    // parseFloat actually does trim whitespace automatically
    expect(safeParseNumber('  42  ')).toBe(42);
  });

  it('should handle zero correctly', () => {
    expect(validatePrice(0)).toBe(0);
    expect(validatePercentage(0)).toBe(0);
  });
});

describe('Real-world Scenarios', () => {
  it('should handle quotation line item calculations', () => {
    const quantity = validateQuantity('5');
    const unitPrice = validatePrice('99.99');
    const discount = validateDiscount('10');

    expect(quantity).toBe(5);
    expect(unitPrice).toBe(99.99);
    expect(discount).toBe(10);

    const subtotal = quantity * unitPrice;
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal - discountAmount;

    expect(subtotal).toBe(499.95);
    expect(total).toBeCloseTo(449.955, 2);
  });

  it('should handle commission calculations', () => {
    const targetAmount = validateTarget('100000');
    const achievedAmount = validatePrice('120000');
    const achievementPercentage = (achievedAmount / targetAmount) * 100;
    const commissionRate = validateCommissionRate('5');

    expect(targetAmount).toBe(100000);
    expect(achievedAmount).toBe(120000);
    expect(achievementPercentage).toBe(120);
    expect(commissionRate).toBe(5);

    const commissionAmount = (achievedAmount * commissionRate) / 100;
    expect(commissionAmount).toBe(6000);
  });

  it('should prevent invalid quotation data', () => {
    // User tries to enter negative price
    const invalidPrice = validatePrice('-50');
    expect(invalidPrice).toBe(0);

    // User tries to enter discount over 100%
    const invalidDiscount = validateDiscount('150');
    expect(invalidDiscount).toBe(100);

    // User clears quantity field
    const emptyQuantity = validateQuantity('');
    expect(emptyQuantity).toBe(1); // Default to 1, not 0
  });
});
