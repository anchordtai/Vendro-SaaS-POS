// Currency formatter for Nigerian Naira (₦)
// Replaces all dollar currency formatting with Naira

export interface CurrencyOptions {
  symbol?: string;
  decimalDigits?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
}

export class CurrencyFormatter {
  private static defaultOptions: CurrencyOptions = {
    symbol: '₦',
    decimalDigits: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.'
  };

  static format(amount: number | string, options?: Partial<CurrencyOptions>): string {
    const opts = { ...this.defaultOptions, ...options };
    
    // Convert to number if string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return `${opts.symbol}0.00`;
    }

    // Format with Nigerian locale
    const formatted = numAmount.toLocaleString('en-NG', {
      minimumFractionDigits: opts.decimalDigits,
      maximumFractionDigits: opts.decimalDigits,
      useGrouping: true
    });

    return `${opts.symbol}${formatted}`;
  }

  static formatCompact(amount: number | string, options?: Partial<CurrencyOptions>): string {
    const opts = { ...this.defaultOptions, ...options };
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return `${opts.symbol}0`;
    }

    if (numAmount >= 1000000) {
      return `${opts.symbol}${(numAmount / 1000000).toFixed(1)}M`;
    } else if (numAmount >= 1000) {
      return `${opts.symbol}${(numAmount / 1000).toFixed(1)}K`;
    } else {
      return this.format(numAmount, opts);
    }
  }

  static parse(formattedAmount: string, options?: Partial<CurrencyOptions>): number {
    const opts = { ...this.defaultOptions, ...options };
    
    // Remove currency symbol and whitespace
    const cleanAmount = formattedAmount
      .replace(new RegExp(`[\\s${opts.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'), '')
      .replace(new RegExp(`\\${opts.thousandsSeparator}`, 'g'), '')
      .replace(new RegExp(`\\${opts.decimalSeparator}`, 'g'), '.');

    const parsed = parseFloat(cleanAmount);
    return isNaN(parsed) ? 0 : parsed;
  }

  static isValidAmount(amount: string | number): boolean {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return !isNaN(numAmount) && numAmount >= 0;
  }

  static calculateTax(amount: number | string, taxRate: number): number {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || isNaN(taxRate)) return 0;
    
    return numAmount * (taxRate / 100);
  }

  static calculateTotal(subtotal: number | string, taxRate: number): number {
    const numSubtotal = typeof subtotal === 'string' ? parseFloat(subtotal) : subtotal;
    if (isNaN(numSubtotal) || isNaN(taxRate)) return 0;
    
    const tax = this.calculateTax(numSubtotal, taxRate);
    return numSubtotal + tax;
  }

  static formatWithTax(amount: number | string, taxRate: number, options?: Partial<CurrencyOptions>): {
    subtotal: string;
    tax: string;
    total: string;
  } {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const tax = this.calculateTax(numAmount, taxRate);
    const total = this.calculateTotal(numAmount, taxRate);

    return {
      subtotal: this.format(numAmount, options),
      tax: this.format(tax, options),
      total: this.format(total, options)
    };
  }

  // POS-specific formatting methods
  static formatForPOS(amount: number | string): string {
    return this.format(amount, {
      symbol: '₦',
      decimalDigits: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.'
    });
  }

  static formatForReceipt(amount: number | string): string {
    return this.format(amount, {
      symbol: '₦',
      decimalDigits: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.'
    });
  }

  static formatForReport(amount: number | string): string {
    return this.format(amount, {
      symbol: '₦',
      decimalDigits: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.'
    });
  }

  // Display formatting for different contexts
  static formatDisplay(amount: number | string, context: 'pos' | 'receipt' | 'report' | 'general' = 'general'): string {
    switch (context) {
      case 'pos':
        return this.formatForPOS(amount);
      case 'receipt':
        return this.formatForReceipt(amount);
      case 'report':
        return this.formatForReport(amount);
      default:
        return this.format(amount);
    }
  }

  // Input validation and sanitization
  static sanitizeInput(input: string): string {
    // Remove all characters except digits, decimal point, and minus sign
    return input.replace(/[^0-9.-]/g, '');
  }

  static formatInput(input: string, options?: Partial<CurrencyOptions>): string {
    const sanitized = this.sanitizeInput(input);
    const parsed = parseFloat(sanitized);
    
    if (isNaN(parsed)) {
      return `${options?.symbol || '₦'}0.00`;
    }

    return this.format(parsed, options);
  }

  // Range validation
  static isInRange(amount: number | string, min: number, max: number): boolean {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return numAmount >= min && numAmount <= max;
  }

  // Rounding helpers
  static round(amount: number | string, decimals: number = 2): number {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return 0;
    
    const factor = Math.pow(10, decimals);
    return Math.round(numAmount * factor) / factor;
  }

  static roundUp(amount: number | string, decimals: number = 2): number {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return 0;
    
    const factor = Math.pow(10, decimals);
    return Math.ceil(numAmount * factor) / factor;
  }

  static roundDown(amount: number | string, decimals: number = 2): number {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return 0;
    
    const factor = Math.pow(10, decimals);
    return Math.floor(numAmount * factor) / factor;
  }

  // Comparison helpers
  static equals(amount1: number | string, amount2: number | string): boolean {
    const num1 = typeof amount1 === 'string' ? parseFloat(amount1) : amount1;
    const num2 = typeof amount2 === 'string' ? parseFloat(amount2) : amount2;
    
    return Math.abs(num1 - num2) < 0.01; // Account for floating point precision
  }

  static greaterThan(amount1: number | string, amount2: number | string): boolean {
    const num1 = typeof amount1 === 'string' ? parseFloat(amount1) : amount1;
    const num2 = typeof amount2 === 'string' ? parseFloat(amount2) : amount2;
    
    return num1 > num2;
  }

  static lessThan(amount1: number | string, amount2: number | string): boolean {
    const num1 = typeof amount1 === 'string' ? parseFloat(amount1) : amount1;
    const num2 = typeof amount2 === 'string' ? parseFloat(amount2) : amount2;
    
    return num1 < num2;
  }
}

// Export convenience functions
export const formatNaira = (amount: number | string, options?: Partial<CurrencyOptions>) => 
  CurrencyFormatter.format(amount, options);

export const parseNaira = (formattedAmount: string, options?: Partial<CurrencyOptions>) => 
  CurrencyFormatter.parse(formattedAmount, options);

export const formatNairaForPOS = (amount: number | string) => 
  CurrencyFormatter.formatForPOS(amount);

export const formatNairaForReceipt = (amount: number | string) => 
  CurrencyFormatter.formatForReceipt(amount);

export const formatNairaForReport = (amount: number | string) => 
  CurrencyFormatter.formatForReport(amount);
