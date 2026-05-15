import { createClient } from "@supabase/supabase-js";

/**
 * Anon Supabase client for public read-only edge-compatible routes.
 *
 * Uses the publishable anon key — safe to call from any server context.
 * RLS policies determine what this client can read; it cannot bypass RLS.
 * Never use for admin operations, webhooks, or any write that requires trust.
 */
export function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
