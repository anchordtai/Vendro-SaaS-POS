export interface Tenant {
  id: string;
  business_name: string;
  business_type: BusinessType;
  business_size: BusinessSize;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  logo_url?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type BusinessType = 'pharmacy' | 'hotel_bar' | 'nightclub' | 'grocery' | 'retail';
export type BusinessSize = 'small' | 'medium' | 'large';

export interface Plan {
  id: string;
  name: string;
  tier: PlanTier;
  monthly_price: number;
  yearly_price: number;
  max_products: number;
  max_outlets: number;
  max_users: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PlanTier = 'starter' | 'growth' | 'enterprise';

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: 'monthly' | 'yearly';
  current_period_start?: string;
  current_period_end?: string;
  trial_ends_at?: string;
  cancelled_at?: string;
  flutterwave_transaction_id?: string;
  flutterwave_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

export interface Outlet {
  id: string;
  tenant_id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  outlet_id?: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'super_admin' | 'tenant_admin' | 'manager' | 'cashier' | 'staff';

export interface Product {
  id: string;
  tenant_id: string;
  outlet_id?: string;
  name: string;
  description?: string;
  price: number;
  cost_price?: number;
  barcode?: string;
  sku?: string;
  category?: string;
  brand?: string;
  stock_quantity: number;
  low_stock_threshold: number;
  reorder_level: number;
  image_url?: string;
  is_active: boolean;
  expiry_date?: string;
  batch_number?: string;
  supplier?: string;
  weight?: number;
  dimensions?: Record<string, any>;
  tags?: string[];
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  tenant_id: string;
  outlet_id?: string;
  cashier_id: string;
  customer_name?: string;
  customer_phone?: string;
  receipt_number?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  notes?: string;
  tab_id?: string;
  is_refunded: boolean;
  refunded_at?: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  tenant_id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface OpenTab {
  id: string;
  tenant_id: string;
  outlet_id?: string;
  customer_name?: string;
  customer_phone?: string;
  tab_number: string;
  total_amount: number;
  status: 'open' | 'closed' | 'cancelled';
  staff_id?: string;
  opened_at: string;
  closed_at?: string;
  created_at: string;
}

export interface InventoryLog {
  id: string;
  tenant_id: string;
  outlet_id?: string;
  product_id: string;
  change_type: 'sale' | 'restock' | 'adjustment' | 'expiry' | 'damage';
  quantity_changed: number;
  quantity_before: number;
  quantity_after: number;
  reason?: string;
  reference_id?: string;
  staff_id?: string;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  tenant_id: string;
  feature_key: string;
  is_enabled: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Business type configurations
export const BUSINESS_TYPE_CONFIGS = {
  pharmacy: {
    name: 'Pharmacy',
    icon: '💊',
    features: [
      'expiry_tracking',
      'batch_tracking',
      'prescription_mode',
      'low_stock_alerts',
      'supplier_management'
    ],
    color: 'blue'
  },
  hotel_bar: {
    name: 'Hotel Bar',
    icon: '🍸',
    features: [
      'open_tabs',
      'fast_checkout',
      'age_verification',
      'table_management',
      'staff_sales_tracking'
    ],
    color: 'purple'
  },
  nightclub: {
    name: 'Nightclub',
    icon: '🎵',
    features: [
      'open_tabs',
      'fast_checkout',
      'age_verification',
      'cover_charges',
      'vip_management'
    ],
    color: 'pink'
  },
  grocery: {
    name: 'Grocery Store',
    icon: '🛒',
    features: [
      'barcode_scanning',
      'bulk_inventory',
      'category_management',
      'weight_based_pricing',
      'promotions'
    ],
    color: 'green'
  },
  retail: {
    name: 'Retail Store',
    icon: '🏪',
    features: [
      'barcode_scanning',
      'category_management',
      'customer_loyalty',
      'returns_management',
      'seasonal_pricing'
    ],
    color: 'orange'
  }
} as const;

// Business size configurations
export const BUSINESS_SIZE_CONFIGS = {
  small: {
    name: 'Small',
    description: '1-10 employees',
    defaultLimits: {
      products: 100,
      outlets: 1,
      users: 3
    }
  },
  medium: {
    name: 'Medium',
    description: '11-50 employees',
    defaultLimits: {
      products: 500,
      outlets: 2,
      users: 5
    }
  },
  large: {
    name: 'Large',
    description: '50+ employees',
    defaultLimits: {
      products: 2000,
      outlets: 3,
      users: 10
    }
  }
} as const;

// Feature definitions
export const FEATURE_DEFINITIONS = {
  expiry_tracking: {
    name: 'Expiry Date Tracking',
    description: 'Track product expiry dates and get alerts',
    business_types: ['pharmacy']
  },
  batch_tracking: {
    name: 'Batch/Lot Tracking',
    description: 'Track products by batch or lot numbers',
    business_types: ['pharmacy']
  },
  prescription_mode: {
    name: 'Prescription Mode',
    description: 'Handle prescription-based sales',
    business_types: ['pharmacy']
  },
  open_tabs: {
    name: 'Open Tabs',
    description: 'Manage customer tabs and running bills',
    business_types: ['hotel_bar', 'nightclub']
  },
  fast_checkout: {
    name: 'Fast Checkout',
    description: 'Quick checkout for high-volume environments',
    business_types: ['hotel_bar', 'nightclub']
  },
  age_verification: {
    name: 'Age Verification',
    description: 'Verify customer age for restricted items',
    business_types: ['hotel_bar', 'nightclub']
  },
  table_management: {
    name: 'Table Management',
    description: 'Manage table assignments and orders',
    business_types: ['hotel_bar']
  },
  barcode_scanning: {
    name: 'Barcode Scanning',
    description: 'Scan barcodes for quick product lookup',
    business_types: ['grocery', 'retail']
  },
  bulk_inventory: {
    name: 'Bulk Inventory Management',
    description: 'Manage bulk items and weight-based pricing',
    business_types: ['grocery']
  },
  category_management: {
    name: 'Category Management',
    description: 'Advanced product categorization',
    business_types: ['grocery', 'retail']
  }
} as const;
