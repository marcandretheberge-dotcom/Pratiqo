import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendTeacherVerificationRequestToAdmin } from "@/lib/email";

export const runtime = "nodejs";

const BUCKET = "teacher-diplomas";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(req: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
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

    // ── Parse FormData ─────────────────────────────────────────────────────
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const note = typeof form.get("note") === "string" ? (form.get("note") as string).trim() : "";

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format non accepté. Utilisez PDF, JPG ou PNG." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)." }, { status: 400 });
    }

    // ── Fetch teacher ──────────────────────────────────────────────────────
    const admin = getSupabaseAdmin();
    const { data: teacher, error: tErr } = await admin
      .from("teachers")
      .select("id, name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tErr || !teacher) {
      return NextResponse.json({ error: "Fiche professeur introuvable." }, { status: 404 });
    }

    const teacherId = (teacher as { id: string }).id;
    const teacherName = (teacher as { name?: string }).name || "Professeur";

    // ── Upload to Supabase Storage using service-role key ──────────────────
    const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1] ?? "jpg";
    const timestamp = Date.now();
    const storagePath = `${user.id}/${teacherId}-${timestamp}.${ext}`;

    const bytes = await file.arrayBuffer();
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      // If the bucket doesn't exist yet, give a clear message
      const msg = uploadErr.message || String(uploadErr);
      console.error("[teacher/diploma] storage upload failed:", msg);
      if (msg.toLowerCase().includes("bucket")) {
        return NextResponse.json(
          {
            error:
              'Le bucket "teacher-diplomas" n\'existe pas encore. Créez-le dans le tableau de bord Supabase.',
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: `Upload échoué: ${msg}` }, { status: 500 });
    }

    // ── Save diploma path in teachers table ────────────────────────────────
    await admin
      .from("teachers")
      .update({ diploma_url: storagePath })
      .eq("id", teacherId);

    // ── Notify admin via email ─────────────────────────────────────────────
    try {
      await sendTeacherVerificationRequestToAdmin({
        teacherName,
        teacherEmail: user.email || "",
        teacherId,
        userId: user.id,
        kind: "diploma",
        description: note || `Diplôme uploadé — fichier: ${storagePath}`,
      });
    } catch (emailErr) {
      console.warn("[teacher/diploma] admin email failed (non-blocking):", emailErr);
    }

    console.log("[teacher/diploma] uploaded:", storagePath, "teacher:", teacherId);

    return NextResponse.json({ ok: true, path: storagePath });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    console.error("[teacher/diploma]", msg, e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
