import { NextResponse } from "next/server";
import { authenticateCafeRequest } from "@/lib/cafe/serverAuth";
import { isCafePresenceEnabled } from "@/lib/cafe/socialFeatureFlags";
import { createCafeSocialUserClient, parsePracticeLanguage } from "@/lib/cafe/socialServer";

export const runtime = "nodejs";

/** Heartbeat + list visible peers for a practice language. */
export async function POST(req: Request) {
  if (!isCafePresenceEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const auth = await authenticateCafeRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    languageCode?: unknown;
    appearOffline?: unknown;
    shortIntro?: unknown;
    clientTabId?: unknown;
  } | null;

  const languageCode = parsePracticeLanguage(body?.languageCode);
  if (!languageCode) {
    return NextResponse.json({ ok: false, error: "invalid_language" }, { status: 400 });
  }

  const appearOffline = body?.appearOffline === true;
  const shortIntro =
    typeof body?.shortIntro === "string" && body.shortIntro.trim().length > 0
      ? body.shortIntro.trim().slice(0, 140)
      : null;
  const clientTabId =
    typeof body?.clientTabId === "string" && body.clientTabId.trim().length > 0
      ? body.clientTabId.trim().slice(0, 64)
      : "default";

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const client = createCafeSocialUserClient(token);
  if (!client) {
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await client.from("cafe_presence").upsert(
    {
      profile_id: auth.id,
      language_code: languageCode,
      status: "available",
      appear_offline: appearOffline,
      short_intro: shortIntro,
      last_seen_at: now,
      client_tab_id: clientTabId,
      updated_at: now,
    },
    { onConflict: "profile_id,client_tab_id" },
  );

  if (upsertError) {
    return NextResponse.json({ ok: false, error: "presence_write_failed" }, { status: 503 });
  }

  const { data: peers, error: listError } = await client
    .from("cafe_presence")
    .select("profile_id, language_code, status, short_intro, last_seen_at")
    .eq("language_code", languageCode)
    .eq("appear_offline", false)
    .gt("last_seen_at", new Date(Date.now() - 75_000).toISOString())
    .order("last_seen_at", { ascending: false })
    .limit(40);

  if (listError) {
    return NextResponse.json({ ok: false, error: "presence_list_failed" }, { status: 503 });
  }

  const visible = (peers ?? []).filter((peer) => peer.profile_id !== auth.id);

  return NextResponse.json({
    ok: true,
    selfOnline: !appearOffline,
    peers: visible.map((peer) => ({
      profileId: peer.profile_id,
      status: peer.status,
      shortIntro: peer.short_intro,
      lastSeenAt: peer.last_seen_at,
    })),
  });
}
