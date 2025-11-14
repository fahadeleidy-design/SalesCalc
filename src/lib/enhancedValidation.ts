/**
 * Enhanced Validation Library
 * Comprehensive validation functions for all system entities
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface QuotationValidation {
  hasCustomer: boolean;
  hasItems: boolean;
  hasValidTotal: boolean;
  hasValidDate: boolean;
  allItemsValid: boolean;
}

/**
 * Validate quotation data before submission
 */
export function validateQuotation(quotation: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Customer validation
  if (!quotation.customer_id) {
    errors.push('Customer is required');
  }

  // Items validation
  if (!quotation.items || quotation.items.length === 0) {
    errors.push('At least one item is required');
  }

  // Total validation
  if (!quotation.total || quotation.total <= 0) {
    errors.push('Total amount must be greater than zero');
  }

  // Valid until date
  if (quotation.valid_until) {
    const validUntil = new Date(quotation.valid_until);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (validUntil < today) {
      errors.push('Valid until date cannot be in the past');
    }

    // Warning for very short validity
    const daysUntilExpiry = Math.ceil((validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 7) {
      warnings.push(`Quotation will expire in ${daysUntilExpiry} days`);
    }
  }

  // Item-level validation
  if (quotation.items) {
    quotation.items.forEach((item: any, index: number) => {
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than zero`);
      }
      if (item.unit_price < 0) {
        errors.push(`Item ${index + 1}: Price cannot be negative`);
      }
      if (!item.product_id && !item.is_custom) {
        errors.push(`Item ${index + 1}: Product selection is required`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate customer data
 */
export function validateCustomer(customer: any): ValidationResult {
  const errors: string[] = [];

  if (!customer.company_name || customer.company_name.trim() === '') {
    errors.push('Company name is required');
  }

  if (!customer.contact_person || customer.contact_person.trim() === '') {
    errors.push('Contact person is required');
  }

  if (customer.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      errors.push('Invalid email format');
    }
  }

  if (customer.phone) {
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    if (!phoneRegex.test(customer.phone)) {
      errors.push('Invalid phone format');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate product data
 */
export function validateProduct(product: any): ValidationResult {
  const errors: string[] = [];

  if (!product.name || product.name.trim() === '') {
    errors.push('Product name is required');
  }

  if (!product.sku || product.sku.trim() === '') {
    errors.push('SKU is required');
  }

  if (product.unit_price !== undefined && product.unit_price < 0) {
    errors.push('Price cannot be negative');
  }

  if (product.cost_price !== undefined && product.cost_price < 0) {
    errors.push('Cost cannot be negative');
  }

  if (product.unit_price && product.cost_price && product.unit_price < product.cost_price) {
    errors.push('Warning: Selling price is less than cost price');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate user data
 */
export function validateUser(user: any): ValidationResult {
  const errors: string[] = [];

  if (!user.full_name || user.full_name.trim() === '') {
    errors.push('Full name is required');
  }

  if (!user.email || user.email.trim() === '') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      errors.push('Invalid email format');
    }
  }

  if (!user.role) {
    errors.push('Role is required');
  }

  if (user.password && user.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate commission calculation
 */
export function validateCommission(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.sales_rep_id) {
    errors.push('Sales representative is required');
  }

  if (!data.quotation_id) {
    errors.push('Quotation is required');
  }

  if (!data.amount || data.amount <= 0) {
    errors.push('Amount must be greater than zero');
  }

  if (data.commission_rate !== undefined) {
    if (data.commission_rate < 0 || data.commission_rate > 1) {
      errors.push('Commission rate must be between 0 and 100%');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate discount amount
 */
export function validateDiscount(
  discount: number,
  total: number,
  maxDiscountPercent: number = 30
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (discount < 0) {
    errors.push('Discount cannot be negative');
  }

  if (discount > total) {
    errors.push('Discount cannot exceed total amount');
  }

  const discountPercent = (discount / total) * 100;

  if (discountPercent > maxDiscountPercent) {
    warnings.push(`Discount of ${discountPercent.toFixed(1)}% requires manager approval`);
  }

  if (discountPercent > 50) {
    errors.push(`Discount of ${discountPercent.toFixed(1)}% exceeds maximum allowed`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercent(discount: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((discount / total) * 100 * 100) / 100; // Round to 2 decimals
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid) return '';
  return result.errors.join('\n');
}

/**
 * Check if user has permission for action
 */
export function hasPermission(
  userRole: string,
  action: string,
  resource: string
): boolean {
  const permissions: Record<string, Record<string, string[]>> = {
    admin: {
      '*': ['create', 'read', 'update', 'delete', 'approve']
    },
    ceo: {
      quotations: ['read', 'approve', 'reject'],
      reports: ['read', 'export'],
      users: ['read'],
      '*': ['read']
    },
    manager: {
      quotations: ['create', 'read', 'update', 'approve', 'reject'],
      customers: ['create', 'read', 'update'],
      products: ['read'],
      users: ['read'],
      reports: ['read', 'export']
    },
    sales: {
      quotations: ['create', 'read', 'update'],
      customers: ['create', 'read', 'update'],
      products: ['read'],
      reports: ['read']
    },
    engineering: {
      quotations: ['read', 'update'],
      products: ['create', 'read', 'update'],
      custom_items: ['review', 'price']
    },
    finance: {
      quotations: ['read', 'approve', 'reject'],
      reports: ['read', 'export'],
      payments: ['create', 'read', 'update']
    }
  };

  // Admin has all permissions
  if (userRole === 'admin') return true;

  const rolePermissions = permissions[userRole];
  if (!rolePermissions) return false;

  // Check wildcard permissions
  if (rolePermissions['*']?.includes(action)) return true;

  // Check resource-specific permissions
  return rolePermissions[resource]?.includes(action) || false;
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  allowedTypes: string[],
  maxSizeMB: number = 5
): ValidationResult {
  const errors: string[] = [];

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    errors.push(`File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed (${maxSizeMB}MB)`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: Date, endDate: Date): ValidationResult {
  const errors: string[] = [];

  if (startDate > endDate) {
    errors.push('Start date must be before end date');
  }

  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    errors.push('Date range cannot exceed 1 year');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate numeric input
 */
export function validateNumeric(
  value: any,
  min?: number,
  max?: number,
  decimals?: number
): ValidationResult {
  const errors: string[] = [];

  const num = Number(value);
  if (isNaN(num)) {
    errors.push('Value must be a number');
    return { valid: false, errors };
  }

  if (min !== undefined && num < min) {
    errors.push(`Value must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    errors.push(`Value must not exceed ${max}`);
  }

  if (decimals !== undefined) {
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    if (decimalPlaces > decimals) {
      errors.push(`Value must have at most ${decimals} decimal places`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
