import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

type Body = { id?: string; completed?: boolean };

async function getSupabaseForRequest(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    return createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          cookieStore.set(c.name, c.value, c.options);
        }
      },
    },
  });
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Body | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const completed = typeof body?.completed === "boolean" ? body.completed : null;
  if (!id || completed === null) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Student completion means "submitted to the teacher"; the teacher review moves it to `reviewed`.
  const nextStatus = completed ? "submitted" : "pending";
  const patch = completed
    ? { status: nextStatus, submitted_at: new Date().toISOString(), reviewed_at: null, archived_at: null }
    : { status: nextStatus, submitted_at: null, reviewed_at: null, archived_at: null };
  const { error } = await supabase.from("assignments").update(patch).eq("id", id).eq("student_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: nextStatus });
}

