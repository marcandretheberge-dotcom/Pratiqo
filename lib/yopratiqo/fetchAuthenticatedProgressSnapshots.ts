/**
 * Browser-side fetch for the authenticated student's YoPratiqo snapshots.
 *
 * Returns `null` when signed out or the request fails (caller should fall
 * back to Intro-first defaults). Returns `[]` when signed in with no rows.
 */

import { getSupabaseClient } from "@/lib/supabase";
import type { ProgressSnapshotRow } from "@/lib/yopratiqo/progressSnapshotPersistence";

export async function fetchAuthenticatedProgressSnapshots(): Promise<
  ProgressSnapshotRow[] | null
> {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) return null;

    const res = await fetch("/api/yo/progress", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;

    const body = (await res.json().catch(() => ({}))) as {
      snapshots?: ProgressSnapshotRow[];
    };
    return Array.isArray(body.snapshots) ? body.snapshots : [];
  } catch {
    return null;
  }
}

/**
 * Whether the learner has persisted YoPratiqo progress the booking bridge
 * can use when consent is granted.
 *
 * Scope matches `summarizeSnapshotsForBridge`: any owner snapshot row
 * across YoPratiqo courses (not Dominican-Republic-only). The server
 * remains authoritative for building the privacy-safe summary.
 */
export function learnerHasYoPratiqoProgressForBridge(
  snapshots: readonly ProgressSnapshotRow[] | null | undefined,
): boolean {
  return Array.isArray(snapshots) && snapshots.length > 0;
}
