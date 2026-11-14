import { NextResponse } from "next/server";
import { authenticateCafeRequest } from "@/lib/cafe/serverAuth";
import { isCafeLoungeChatEnabled } from "@/lib/cafe/socialFeatureFlags";
import {
  createCafeSocialUserClient,
  parsePracticeLanguage,
  sanitizeCafeMessageBody,
} from "@/lib/cafe/socialServer";

export const runtime = "nodejs";

async function resolveLoungeId(
  client: NonNullable<ReturnType<typeof createCafeSocialUserClient>>,
  languageCode: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("cafe_lounges")
    .select("id")
    .eq("language_code", languageCode)
    .maybeSingle();
  if (error || !data?.id) return null;
  return data.id as string;
}

export async function GET(req: Request) {
  if (!isCafeLoungeChatEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const auth = await authenticateCafeRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const languageCode = parsePracticeLanguage(url.searchParams.get("language"));
  if (!languageCode) {
    return NextResponse.json({ ok: false, error: "invalid_language" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const client = createCafeSocialUserClient(token);
  if (!client) {
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  const loungeId = await resolveLoungeId(client, languageCode);
  if (!loungeId) {
    return NextResponse.json({ ok: false, error: "lounge_missing" }, { status: 404 });
  }

  const { data, error } = await client
    .from("cafe_lounge_messages")
    .select("id, profile_id, body, created_at")
    .eq("lounge_id", loungeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: "messages_unavailable" }, { status: 503 });
  }

  const messages = [...(data ?? [])].reverse().map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    body: row.body,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ ok: true, loungeId, messages });
}

export async function POST(req: Request) {
  if (!isCafeLoungeChatEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const auth = await authenticateCafeRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    languageCode?: unknown;
    body?: unknown;
  } | null;

  const languageCode = parsePracticeLanguage(body?.languageCode);
  const messageBody = sanitizeCafeMessageBody(body?.body);
  if (!languageCode || !messageBody) {
    return NextResponse.json({ ok: false, error: "invalid_message" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const client = createCafeSocialUserClient(token);
  if (!client) {
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  const loungeId = await resolveLoungeId(client, languageCode);
  if (!loungeId) {
    return NextResponse.json({ ok: false, error: "lounge_missing" }, { status: 404 });
  }

  const { data, error } = await client
    .from("cafe_lounge_messages")
    .insert({
      lounge_id: loungeId,
      profile_id: auth.id,
      body: messageBody,
    })
    .select("id, profile_id, body, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "message_rejected" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    message: {
      id: data.id,
      profileId: data.profile_id,
      body: data.body,
      createdAt: data.created_at,
    },
  });
}
