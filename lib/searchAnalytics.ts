import { getAnalyticsAnonymousId } from "@/lib/privacy/analyticsAnonymousId";
import { hasAnalyticsConsent } from "@/lib/privacy/cookieConsent";
import { getSupabaseClient } from "@/lib/supabase";

export type SearchAnalyticsSource = "landing" | "student_search" | "quiz" | "map";

type BasePayload = {
  source: SearchAnalyticsSource;
  category?: string | null;
  subject?: string | null;
  format?: string | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
  timezone?: string | null;
  filters?: Record<string, unknown>;
  result_count?: number | null;
};

function getAnonymousSessionId(): string {
  return getAnalyticsAnonymousId();
}

async function authHeaderForAnalytics(): Promise<Record<string, string>> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    /* ignore */
  }
  return {};
}

async function postEventAuthed(body: Record<string, unknown>) {
  const auth = await authHeaderForAnalytics();
  try {
    await fetch("/api/analytics/search-event", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    /* best-effort */
  }
}

/** Fire-and-forget search demand signal (never throws). Requires analytics consent. */
export function logSearchEvent(payload: BasePayload): void {
  if (!hasAnalyticsConsent()) return;
  const anonymous_session_id = getAnonymousSessionId();
  void postEventAuthed({
    ...payload,
    anonymous_session_id: anonymous_session_id || null,
  });
}

export function logTeacherClick(payload: {
  source: SearchAnalyticsSource;
  clicked_teacher_id: string;
  filters?: Record<string, unknown>;
}): void {
  if (!hasAnalyticsConsent()) return;
  void postEventAuthed({
    source: payload.source,
    clicked_teacher_id: payload.clicked_teacher_id,
    filters: payload.filters ?? {},
    result_count: null,
    anonymous_session_id: getAnonymousSessionId() || null,
  });
}

export function logBookingFromSearch(payload: {
  source: SearchAnalyticsSource;
  booked_teacher_id: string;
  filters?: Record<string, unknown>;
}): void {
  if (!hasAnalyticsConsent()) return;
  void postEventAuthed({
    source: payload.source,
    booked_teacher_id: payload.booked_teacher_id,
    filters: payload.filters ?? {},
    result_count: null,
    anonymous_session_id: getAnonymousSessionId() || null,
  });
}
