export const formatCurrency = (
  amount: number,
  currencyCode: string = 'SAR',
  options?: Intl.NumberFormatOptions
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
};

export const formatCurrencyCompact = (
  amount: number,
  currencyCode: string = 'SAR'
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const CURRENCY_SYMBOL = 'SAR';
export const CURRENCY_CODE = 'SAR';

export const SUPPORTED_CURRENCIES = [
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
];
