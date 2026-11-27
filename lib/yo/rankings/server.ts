import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const rankingResponse = (body: unknown, status = 200) => Response.json(body, {
  status, headers: { "Cache-Control": "private, no-store", "Vary": "Authorization", ...(status === 429 ? { "Retry-After": "60" } : {}) },
});
export function rankingFailure(error: { message?: string } | null) {
  const message = error?.message ?? "";
  if (message.includes("account_unavailable")) return rankingResponse({ error: "account_unavailable" }, 403);
  if (message.includes("invalid_friend")) return rankingResponse({ error: "invalid_friend" }, 409);
  if (message.includes("rate_limited")) return rankingResponse({ error: "rate_limited" }, 429);
  if (message.includes("invalid_request")) return rankingResponse({ error: "invalid_request" }, 400);
  return rankingResponse({ error: "unavailable" }, 503);
}

/** Bearer auth deliberately does not enable the older, unverified SRS ledger. */
export async function rankingAccount(req: Request, kind: "read" | "profile" | "friends" | "attempt") {
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token || token.length > 8192) return { ok: false, response: rankingResponse({ error: "unauthorized" }, 401) } as const;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, response: rankingFailure(null) } as const;
  try {
    const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return { ok: false, response: rankingResponse({ error: "unauthorized" }, 401) } as const;
    const bannedUntil = (user as unknown as { banned_until?: string }).banned_until;
    if (user.is_anonymous || (bannedUntil && Date.parse(bannedUntil) > Date.now())) {
      return { ok: false, response: rankingResponse({ error: "account_unavailable" }, 403) } as const;
    }
    const admin = getSupabaseAdmin();
    const limit = await admin.rpc("yo_rankings_throttle", { p_user_id: user.id, p_kind: kind });
    if (limit.error) return { ok: false, response: rankingFailure(limit.error) } as const;
    if (limit.data !== true) return { ok: false, response: rankingResponse({ error: "rate_limited" }, 429) } as const;
    return { ok: true, userId: user.id, admin } as const;
  } catch { return { ok: false, response: rankingFailure(null) } as const; }
}
