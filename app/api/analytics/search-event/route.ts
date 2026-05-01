import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type SearchEventBody = {
  anonymous_session_id?: string | null;
  source?: string;
  category?: string | null;
  subject?: string | null;
  format?: string | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
  timezone?: string | null;
  filters?: Record<string, unknown>;
  result_count?: number | null;
  clicked_teacher_id?: string | null;
  booked_teacher_id?: string | null;
};

async function getUserIdFromBearer(request: Request): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function tryAdminInsert(row: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  void admin.from("search_events").insert(row).then(({ error }) => {
    if (error) console.error("[search_events]", error.message);
  });
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json().catch(() => null)) as SearchEventBody | null;
    const source = typeof raw?.source === "string" && raw.source.trim() ? raw.source.trim().slice(0, 64) : null;
    if (!source) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const userId = await getUserIdFromBearer(request).catch(() => null);

    const filters =
      raw?.filters && typeof raw.filters === "object" && !Array.isArray(raw.filters) ? raw.filters : {};

    const row = {
      user_id: userId,
      anonymous_session_id:
        typeof raw?.anonymous_session_id === "string" ? raw.anonymous_session_id.slice(0, 128) : null,
      source,
      category: raw?.category ?? null,
      subject: raw?.subject ?? null,
      format: raw?.format ?? null,
      city: raw?.city ?? null,
      region: raw?.region ?? null,
      country_code: raw?.country_code ?? null,
      timezone: raw?.timezone ?? null,
      filters,
      result_count: typeof raw?.result_count === "number" && Number.isFinite(raw.result_count) ? Math.round(raw.result_count) : null,
      clicked_teacher_id: raw?.clicked_teacher_id ?? null,
      booked_teacher_id: raw?.booked_teacher_id ?? null,
    };

    tryAdminInsert(row);
  } catch (e) {
    console.error("[search-event]", e);
  }
  return NextResponse.json({ ok: true });
}
