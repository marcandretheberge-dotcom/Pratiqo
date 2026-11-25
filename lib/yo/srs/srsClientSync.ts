/**
 * Browser-side write-through sync for server SRS state (spec §1.5, §2.7
 * step 2). Mirrors lib/yopratiqo/fetchAuthenticatedProgressSnapshots.ts:
 * the Supabase session token travels in `Authorization: Bearer`, and every
 * failure is swallowed — localStorage remains the offline cache and the
 * learner's flow NEVER blocks on the network. Signed-out learners simply
 * stay local-only, exactly as before this step.
 */

import { getSupabaseClient } from "@/lib/supabase";
import type { DailyAnswer, DailySummary } from "@/lib/yo/daily/contract";

async function learningSession() {
  if (process.env.NEXT_PUBLIC_YO_SRS_SERVER_ENABLED !== "true") return null;
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token && session.user?.id ? { token: session.access_token, owner: session.user.id } : null;
  } catch {
    return null;
  }
}

async function accessToken() {
  return (await learningSession())?.token ?? null;
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


export function onItalianTodayAccountChange(refresh: () => void) {
  if (process.env.NEXT_PUBLIC_YO_SRS_SERVER_ENABLED !== "true") return () => {};
  try {
    const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(() => refresh());
    return () => subscription.unsubscribe();
  } catch { return () => {}; }
}

async function dailyRequest<T>(url: string, signal: AbortSignal, body?: unknown, method = "GET", expectedOwner?: string) {
  try {
    const session = await learningSession();
    if (!session || signal.aborted || (expectedOwner && session.owner !== expectedOwner)) return { value: null, status: 0 };
    const response = await fetch(url, {
      method, headers: { Authorization: `Bearer ${session.token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store", signal,
    });
    return { value: response.ok ? await response.json() as T : null, status: response.status, owner: session.owner };
  } catch { return { value: null, status: 0 }; }
}

export async function fetchItalianToday(signal: AbortSignal) {
  const result = await dailyRequest<DailySummary>("/api/yo/today", signal);
  return result.value && result.owner ? { summary: result.value, owner: result.owner } : null;
}

export function answerItalianDaily(body: { day: string; kind: "mission" | "trivia"; itemId: string; choice: number }, signal: AbortSignal, owner: string) {
  return dailyRequest<DailyAnswer>("/api/yo/daily/complete", signal, body, "POST", owner);
}

export function saveItalianDailyGoal(goal: number | null, signal: AbortSignal, owner: string) {
  return dailyRequest<{ goal: number | null }>("/api/yo/daily/goal", signal, { goal }, "PUT", owner);
}
