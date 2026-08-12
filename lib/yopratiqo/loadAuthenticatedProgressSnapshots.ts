/**
 * Server-only loader for the authenticated user's YoPratiqo progress snapshots.
 *
 * Used by public YoPratiqo server surfaces (e.g. DR Course Home) that need
 * owner-scoped progress without converting the page to a client component.
 *
 * Returns:
 *   • `null` when the visitor is signed out, env is misconfigured, or load fails
 *   • `[]` when signed in but the student has no snapshot rows yet
 *   • rows otherwise — always filtered to `user_id = auth uid` server-side
 */

import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { ProgressSnapshotRow } from "@/lib/yopratiqo/progressSnapshotPersistence";

export async function loadAuthenticatedProgressSnapshots(): Promise<
  ProgressSnapshotRow[] | null
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    });

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) return null;

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("yopratiqo_progress_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("last_activity_at", { ascending: false })
      .limit(64);

    if (error) {
      console.error(
        "[yopratiqo] loadAuthenticatedProgressSnapshots failed:",
        error.message,
      );
      return null;
    }

    return (data ?? []) as ProgressSnapshotRow[];
  } catch (err) {
    console.error("[yopratiqo] loadAuthenticatedProgressSnapshots error:", err);
    return null;
  }
}
