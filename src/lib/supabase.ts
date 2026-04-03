import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Use environment variables with fallback
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vlksqjwupktmvypfmfur.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_W1KzX92aK0WxgBuNyr7ECg_LcZnH6ke";

// Client-side Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
});

// Server-side Supabase client (for API routes)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsa3Nxand1cGt0bXZ5cGZtdXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjQ4MjcwNzQsImV4cCI6MjA0MDQwMzA3NH0.wYJ2zQgJlCuKFYFvLxIFJ0xsBVD6-JJdGOuJ-iMVdgI",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsa3Nxand1cGt0bXZ5cGZtdXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjQ4MjcwNzQsImV4cCI6MjA0MDQwMzA3NH0.wYJ2zQgJlCuKFYFvLxIFJ0xsBVD6-JJdGOuJ-iMVdgI"
      }
    }
  }
);

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "super_admin" | "cashier";
  status: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  barcode: string;
  stock_quantity: number;
  category: string;
  image: string;
  low_stock_threshold?: number;
  created_at: string;
}

export interface Sale {
  id: string;
  cashier_id: string;
  cashier_name?: string;
  total_amount: number;
  payment_method: "cash" | "pos_card" | "bank_transfer";
  receipt_number?: string;
  created_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface InventoryLog {
  id: string;
  product_id: string;
  change_type: "sale" | "restock" | "adjustment";
  quantity_changed: number;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}