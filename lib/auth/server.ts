import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ServerAuthResult = {
  supabase: SupabaseClient;
  user: User | null;
};

/**
 * Server-side auth helper for RSC layouts and Route Handlers.
 *
 * Uses @supabase/ssr createServerClient so the JWT is read from cookies and
 * cryptographically verified by Supabase — not just presence-checked.
 *
 * Usage in a Server Component layout:
 *   const { user } = await getCurrentUserServer();
 *   if (!user) redirect('/login');
 *
 * The returned `supabase` client inherits the user's session and respects RLS,
 * making it safe for profile lookups without elevating to service role.
 */
export async function getCurrentUserServer(): Promise<ServerAuthResult> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // Layouts are read-only — token refresh writes are intentionally no-ops.
        // Route handlers that need to refresh tokens should handle setAll themselves.
        setAll() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}
