import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPlannedPackageSessionDraft } from "@/lib/offers/createPlannedPackageSessionDraft";
import {
  canUsePlannedPackageSessionDrafts,
  parseDraftSessionStarts,
} from "@/lib/offers/plannedPackageSessionDrafts";

export const runtime = "nodejs";

async function requireStudentUser(req: Request): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, response: NextResponse.json({ error: "server_error" }, { status: 500 }) };
  }
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }
  return { ok: true, userId: data.user.id };
}

export async function POST(req: Request) {
  if (!canUsePlannedPackageSessionDrafts()) {
    return NextResponse.json({ error: "session_drafts_disabled" }, { status: 403 });
  }

  const auth = await requireStudentUser(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const teacherOfferId =
    body && typeof body === "object" && typeof (body as { teacherOfferId?: unknown }).teacherOfferId === "string"
      ? (body as { teacherOfferId: string }).teacherOfferId.trim()
      : "";
  if (!teacherOfferId) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const sessions = parseDraftSessionStarts(body);
  if (!sessions.ok) {
    return NextResponse.json({ error: sessions.error }, { status: 400 });
  }

  try {
    const result = await createPlannedPackageSessionDraft({
      studentId: auth.userId,
      teacherOfferId,
      startsAt: sessions.startsAt,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ draft: result.draft });
  } catch {
    return NextResponse.json({ error: "draft_creation_failed" }, { status: 500 });
  }
}
