import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // createBrowserClient stores auth tokens and PKCE code verifier in cookies
  // (not localStorage) so the server-side /auth/callback route can read them.
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
