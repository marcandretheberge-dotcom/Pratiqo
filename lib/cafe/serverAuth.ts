import { createClient } from "@supabase/supabase-js";

export type CafeAuthenticatedUser =
  | { ok: true; id: string; email: string | null }
  | { ok: false; status: 401 | 500; error: string };

export async function authenticateCafeRequest(req: Request): Promise<CafeAuthenticatedUser> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "unauthorized" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, status: 500, error: "server_misconfigured" };
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) return { ok: false, status: 401, error: "unauthorized" };
  if (user.is_anonymous === true) return { ok: false, status: 401, error: "permanent_account_required" };

  return { ok: true, id: user.id, email: user.email ?? null };
}
