import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requestAccountDeletion } from "@/lib/accountDeletion";

export const runtime = "nodejs";

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { userId: null, error: "Missing Authorization bearer token." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { userId: null, error: "Missing Supabase env." };

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser(token);
  if (error || !user) return { userId: null, error: "Invalid or expired session." };
  return { userId: user.id, error: null };
}

export async function POST(req: Request) {
  const { userId, error } = await getAuthenticatedUser(req);
  if (!userId) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await requestAccountDeletion(userId);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Account deletion request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
