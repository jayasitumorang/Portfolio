import "server-only";
import { createClient } from "@supabase/supabase-js";

export const VISITOR_TABLE = "log_viewers";
export const ORDER_TABLE = "book_orders";
export const BOOK_BUCKET = "books";

/** Server-side Supabase client using the secret key. Returns null until both env vars are set. */
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type ViewRow = {
  created_at: string;
  path: string;
  referrer: string | null;
  source: string;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  visitor_id: string;
  ip_address: string | null;
};

export type OrderStatus = "pending" | "paid" | "expired" | "failed" | "refunded";

export type OrderRow = {
  created_at: string;
  order_id: string;
  access_token: string;
  book_slug: string;
  book_title: string;
  amount: number;
  email: string;
  name: string | null;
  status: OrderStatus;
  payment_type: string | null;
  issuer: string | null;
  transaction_id: string | null;
  qr_url: string | null;
  expires_at: string | null;
  paid_at: string | null;
  downloads: number;
  country: string | null;
  device: string | null;
};
