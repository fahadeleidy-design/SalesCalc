/**
 * Input Validation Utilities
 *
 * Provides safe number parsing and validation for user inputs
 * to prevent negative numbers, NaN, and edge cases.
 */

/**
 * Safely parse a number from a string input
 * Returns the parsed number or a default value if invalid
 */
export function safeParseNumber(
  value: string | number,
  options: {
    min?: number;
    max?: number;
    defaultValue?: number;
    allowDecimals?: boolean;
  } = {}
): number {
  const {
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    defaultValue = 0,
    allowDecimals = true,
  } = options;

  // Handle empty string
  if (value === '' || value === null || value === undefined) {
    return defaultValue;
  }

  // Convert to number
  let num: number;
  if (typeof value === 'string') {
    num = allowDecimals ? parseFloat(value) : parseInt(value, 10);
  } else {
    num = value;
  }

  // Check for NaN
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }

  // Apply min/max constraints
  if (num < min) {
    return min;
  }
  if (num > max) {
    return max;
  }

  return num;
}

/**
 * Validate a price input (must be non-negative)
 */
export function validatePrice(value: string | number): number {
  return safeParseNumber(value, {
    min: 0,
    defaultValue: 0,
    allowDecimals: true,
  });
}

/**
 * Validate a quantity input (must be positive)
 */
export function validateQuantity(value: string | number): number {
  return safeParseNumber(value, {
    min: 0,
    defaultValue: 1,
    allowDecimals: true,
  });
}

/**
 * Validate a percentage input (0-100)
 */
export function validatePercentage(value: string | number): number {
  return safeParseNumber(value, {
    min: 0,
    max: 100,
    defaultValue: 0,
    allowDecimals: true,
  });
}

/**
 * Validate a discount percentage (0-100)
 */
export function validateDiscount(value: string | number): number {
  return validatePercentage(value);
}

/**
 * Validate a tax rate (0-100)
 */
export function validateTaxRate(value: string | number): number {
  return validatePercentage(value);
}

/**
 * Validate commission rate (0-100)
 */
export function validateCommissionRate(value: string | number): number {
  return validatePercentage(value);
}

/**
 * Validate a target amount (must be positive)
 */
export function validateTarget(value: string | number): number {
  return safeParseNumber(value, {
    min: 0,
    defaultValue: 0,
    allowDecimals: true,
  });
}

/**
 * Format a number for display with error handling
 */
export function safeFormatNumber(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || !isFinite(num)) {
    return '0';
  }

  return num.toFixed(decimals);
}

/**
 * Check if a value is a valid number
 */
export function isValidNumber(value: any): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && isFinite(num);
}

/**
 * Validate input on blur to show user feedback
 */
export function validateNumberInput(
  input: HTMLInputElement,
  options: {
    min?: number;
    max?: number;
    required?: boolean;
  } = {}
): boolean {
  const { min = 0, max, required = false } = options;
  const value = input.value;

  // Check required
  if (required && (value === '' || value === null)) {
    input.setCustomValidity('This field is required');
    return false;
  }

  // Check if it's a number
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) {
    input.setCustomValidity('Please enter a valid number');
    return false;
  }

  // Check min
  if (min !== undefined && num < min) {
    input.setCustomValidity(`Value must be at least ${min}`);
    return false;
  }

  // Check max
  if (max !== undefined && num > max) {
    input.setCustomValidity(`Value must be at most ${max}`);
    return false;
  }

  // Clear any previous error
  input.setCustomValidity('');
  return true;
}
