/**
 * Browser-side write-through sync for server SRS state (spec §1.5, §2.7
 * step 2). Mirrors lib/yopratiqo/fetchAuthenticatedProgressSnapshots.ts:
 * the Supabase session token travels in `Authorization: Bearer`, and every
 * failure is swallowed — localStorage remains the offline cache and the
 * learner's flow NEVER blocks on the network. Signed-out learners simply
 * stay local-only, exactly as before this step.
 */

import { getSupabaseClient } from "@/lib/supabase";

async function accessToken(): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_YO_SRS_SERVER_ENABLED !== "true") return null;
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Fire-and-forget: record one answered activity on the server. */
export async function syncSrsActivityRecord(
  itemId: string,
  correct: boolean,
  assisted: boolean,
): Promise<boolean> {
  try {
    const token = await accessToken();
    if (!token) return false;
    const attemptId = crypto.randomUUID();
    const request = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ attemptId, itemId, language: "it", correct, assisted }),
    };
    for (let retry = 0; retry < 2; retry++) {
      try {
        const res = await fetch("/api/yo/srs/record", request);
        if (res.status !== 503 || retry === 1) return res.ok;
      } catch {
        if (retry === 1) return false;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * One-time import of the raw localStorage progress (the server enforces
 * one-time-ness via yo_srs_import_state; a 409 simply means "done").
 * Returns the server's counts, or null when signed out / failed.
 */
export async function importLocalSrsProgress(
  rawLocal: string,
): Promise<{ imported: number; dropped: number } | null> {
  try {
    const token = await accessToken();
    if (!token) return null;
    const res = await fetch("/api/yo/srs/import", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ progress: rawLocal }),
    });
    if (res.status === 409) return { imported: 0, dropped: 0 };
    if (!res.ok) return null;
    const body = (await res.json().catch(() => ({}))) as {
      imported?: number;
      dropped?: number;
    };
    return {
      imported: typeof body.imported === "number" ? body.imported : 0,
      dropped: typeof body.dropped === "number" ? body.dropped : 0,
    };
  } catch {
    return null;
  }
}


export async function fetchItalianToday(signal: AbortSignal) {
  try {
    const token = await accessToken();
    if (!token || signal.aborted) return null;
    const response = await fetch("/api/yo/today", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store", signal,
    });
    if (!response.ok) return null;
    const result = await response.json() as { exercises: number; streak: number };
    return Number.isSafeInteger(result.exercises) && result.exercises >= 0 &&
      Number.isSafeInteger(result.streak) && result.streak >= 0 ? result : null;
  } catch { return null; }
}
