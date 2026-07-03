import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve a bearer token for server API routes from the browser Supabase client. */
export async function getClientAccessToken(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error) {
    console.error("[auth] refreshSession failed while resolving access token", error.message);
    return null;
  }
  return refreshed.session?.access_token ?? null;
}
