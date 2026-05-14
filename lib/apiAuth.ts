import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type ApiUserAuth = {
  user: User;
  admin: AdminClient;
};

export type ApiAdminAuth = {
  user: { id: string };
  userId: string;
  admin: AdminClient;
};

function bearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function requireBearerUser(req: Request): Promise<ApiUserAuth | NextResponse> {
  const token = bearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  return { user, admin: getSupabaseAdmin() };
}

export async function requireBearerAdmin(req: Request): Promise<ApiAdminAuth | NextResponse> {
  const auth = await requireBearerUser(req);
  if (auth instanceof NextResponse) return auth;

  const { user, admin } = auth;
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if ((profile as { role?: string | null } | null)?.role !== "admin") {
    return NextResponse.json({ error: "Acces refuse. Role admin requis." }, { status: 403 });
  }

  return { user: { id: user.id }, userId: user.id, admin };
}
