import "server-only";
import { createClient } from "@supabase/supabase-js";

export const VISITOR_TABLE = "log_viewers";

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
