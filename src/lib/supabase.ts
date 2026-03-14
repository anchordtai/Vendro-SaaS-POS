import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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