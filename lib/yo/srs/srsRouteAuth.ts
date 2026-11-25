/**
 * Bearer-token authentication for the /api/yo/srs routes.
 *
 * The exact pattern of app/api/yo/progress/route.ts: the caller presents a
 * Supabase access token in `Authorization: Bearer`, the token must resolve
 * to an authenticated user, and `user_id` always comes from that session —
 * never from the request body.
 */

import { createClient } from "@supabase/supabase-js";

function getUserClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type SrsAuthResult =
  | { ok: true; user: { id: string } }
  | { ok: false; status: number; error: string };

export async function authenticateSrsRequest(req: Request): Promise<SrsAuthResult> {
  if (process.env.YO_SRS_SERVER_ENABLED !== "true") {
    return { ok: false, status: 404, error: "Not found" };
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(\S+)$/i.exec(authHeader)?.[1];
  if (!token) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const userClient = getUserClient(token);
  if (!userClient) {
    return { ok: false, status: 500, error: "Server misconfigured" };
  }
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true, user };
}
