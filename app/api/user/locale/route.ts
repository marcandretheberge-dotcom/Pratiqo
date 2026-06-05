/**
 * PATCH /api/user/locale
 *
 * Persist the authenticated user's UI locale choice to
 * `auth.users.user_metadata.locale` so server-side senders
 * (booking reminders, welcome emails, etc.) pick it up.
 *
 * Why this exists:
 *   Before this route, `components/LocaleSwitcher.tsx` only wrote
 *   `pratiqo-locale` to `localStorage` + cookie. The reminder cron resolves
 *   each recipient's locale from `auth.users.user_metadata.locale` and the
 *   profile row, so a Québec teacher who switched the UI to Français kept
 *   receiving English reminders forever — the server never learned about the
 *   change. This endpoint closes that loop.
 *
 * Contract:
 *   - PATCH with `{ locale: "fr" | "en" | "es" | <any normalizable string> }`
 *   - Requires Authorization: Bearer <access_token>.
 *   - Does NOT touch payment, billing, RLS, or any restricted system. The
 *     only write target is `auth.users.user_metadata` (locale field).
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeLocale } from "@/lib/i18n/types";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization bearer token." },
      { status: 401 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Missing Supabase env." }, { status: 500 });
  }

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  let body: { locale?: unknown } = {};
  try {
    body = (await req.json()) as { locale?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = typeof body.locale === "string" ? body.locale.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "Missing locale." }, { status: 400 });
  }

  // `normalizeLocale` accepts FR/EN/ES, fr-CA, fr_FR, French, français, etc.
  // Anything else falls through to DEFAULT_LOCALE (`en`); we let that pass —
  // the server is the source of truth for normalization.
  const locale = normalizeLocale(raw);

  const admin = getSupabaseAdmin();
  try {
    const existingMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...existingMetadata, locale },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to persist locale.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, locale });
}
