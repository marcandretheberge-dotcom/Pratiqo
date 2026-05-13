import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rateLimitByIp, rateLimitResponse } from "@/lib/rateLimit";
import { validateJsonBody } from "@/lib/validation/api";
import { teacherCredentialPostSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // ── Rate limit ────────────────────────────────────────────────────────────
    const rl = await rateLimitByIp(req, "teacher-credentials", { limit: 10, windowSeconds: 60 });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds!, rl);

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: "Configuration manquante." }, { status: 500 });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    // ── Role check ────────────────────────────────────────────────────────────
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Accès réservé aux professeurs." }, { status: 403 });
    }

    // ── Resolve teacher by user_id (never trust client-supplied teacher_id) ──
    const { data: teacher, error: tErr } = await admin
      .from("teachers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tErr || !teacher) {
      return NextResponse.json({ error: "Fiche professeur introuvable." }, { status: 404 });
    }

    const teacherId = (teacher as { id: string }).id;

    // ── Validate body ─────────────────────────────────────────────────────────
    const parsed = await validateJsonBody(teacherCredentialPostSchema, req);
    if (!parsed.ok) return parsed.response;

    const { type, title, institution_name, country, issued_year, verification_method } =
      parsed.data;

    // ── Insert credential ─────────────────────────────────────────────────────
    const { data: credential, error: insertErr } = await admin
      .from("teacher_credentials")
      .insert({
        teacher_id: teacherId,
        type,
        title,
        institution_name: institution_name ?? null,
        country: country ?? null,
        issued_year: issued_year ?? null,
        verification_status: "pending",
        verification_method,
        public_label: title,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[teacher/credentials] insert failed:", insertErr.message);
      return NextResponse.json({ error: "Impossible d'enregistrer le diplôme." }, { status: 500 });
    }

    console.log("[teacher/credentials] created:", credential.id, "teacher:", teacherId);

    return NextResponse.json({ ok: true, credential });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    console.error("[teacher/credentials]", msg, e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
