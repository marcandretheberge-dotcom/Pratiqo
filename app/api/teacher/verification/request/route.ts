import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTeacherVerificationRequestToAdmin } from "@/lib/email";

export const runtime = "nodejs";

type Body = {
  kind?: "identity" | "diploma";
  description?: string;
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token." }, { status: 401 });
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

    const { data: profile } = await supabaseUser.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = (profile as { role?: string } | null)?.role;
    if (role !== "teacher") {
      return NextResponse.json({ error: "Réservé aux professeurs." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const kind = body?.kind === "diploma" ? "diploma" : body?.kind === "identity" ? "identity" : null;
    if (!kind) {
      return NextResponse.json({ error: "kind doit être identity ou diploma." }, { status: 400 });
    }

    const { data: teacher, error: tErr } = await supabaseUser
      .from("teachers")
      .select("id, name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tErr || !teacher) {
      return NextResponse.json({ error: "Fiche professeur introuvable." }, { status: 404 });
    }

    const desc = typeof body?.description === "string" ? body.description.trim().slice(0, 2000) : "";

    await sendTeacherVerificationRequestToAdmin({
      teacherName: (teacher as { name?: string }).name || "Professeur",
      teacherEmail: user.email || "",
      teacherId: (teacher as { id: string }).id,
      userId: user.id,
      kind,
      description: desc || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/teacher/verification/request]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
