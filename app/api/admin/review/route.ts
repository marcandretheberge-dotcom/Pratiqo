import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const DIPLOMA_BUCKET = "teacher-diplomas";
const SIGNED_URL_TTL = 3600; // 1 hour

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireAdmin(req: Request): Promise<
  | { user: { id: string }; admin: ReturnType<typeof getSupabaseAdmin> }
  | NextResponse
> {
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

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile as { role?: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé. Rôle admin requis." }, { status: 403 });
  }

  return { user: { id: user.id }, admin };
}

// ── GET — load pending diplomas and credentials ────────────────────────────────

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { admin } = auth;

  try {
    // Pending diploma uploads: diploma_url set but diploma_verified is not true
    const { data: diplomaTeachers, error: dtErr } = await admin
      .from("teachers")
      .select(
        "id, name, user_id, diploma_url, verification_level, identity_verified, stripe_identity_status, diploma_verified",
      )
      .not("diploma_url", "is", null)
      .or("diploma_verified.is.null,diploma_verified.eq.false")
      .order("name");

    if (dtErr) {
      console.error("[admin/review] GET diplomas error:", dtErr);
      return NextResponse.json({ error: dtErr.message }, { status: 500 });
    }

    // Pending credentials
    const { data: pendingCreds, error: pcErr } = await admin
      .from("teacher_credentials")
      .select(
        "id, teacher_id, type, title, institution_name, country, issued_year, verification_method, public_label, created_at",
      )
      .eq("verification_status", "pending")
      .order("created_at");

    if (pcErr) {
      console.error("[admin/review] GET credentials error:", pcErr);
      return NextResponse.json({ error: pcErr.message }, { status: 500 });
    }

    // Collect all user_ids for a single profile batch lookup
    const diplomaUserIds = (diplomaTeachers ?? [])
      .map((t) => (t as { user_id?: string | null }).user_id)
      .filter(Boolean) as string[];

    const credTeacherIds = (pendingCreds ?? [])
      .map((c) => (c as { teacher_id?: string | null }).teacher_id)
      .filter(Boolean) as string[];

    // Fetch teacher rows for credential items (to get user_id + name)
    const credTeacherRows =
      credTeacherIds.length > 0
        ? ((
            await admin
              .from("teachers")
              .select("id, name, user_id")
              .in("id", credTeacherIds)
          ).data ?? [])
        : [];

    const credUserIds = (credTeacherRows as { user_id?: string | null }[])
      .map((t) => t.user_id)
      .filter(Boolean) as string[];

    const allUserIds = Array.from(new Set([...diplomaUserIds, ...credUserIds]));
    const profilesData =
      allUserIds.length > 0
        ? ((
            await admin.from("profiles").select("id, email").in("id", allUserIds)
          ).data ?? [])
        : [];

    const emailMap = new Map<string, string>(
      (profilesData as { id: string; email?: string | null }[]).map((p) => [p.id, p.email ?? ""]),
    );
    const credTeacherMap = new Map(
      (credTeacherRows as { id: string; name?: string | null; user_id?: string | null }[]).map(
        (t) => [t.id, t],
      ),
    );

    // Generate signed URLs for diploma files
    type DiplomaItem = {
      teacherId: string;
      teacherName: string;
      teacherEmail: string | null;
      diplomaPath: string;
      signedUrl: string | null;
      verificationLevel: number | null;
      identityVerified: boolean;
      stripeIdentityStatus: string | null;
    };

    const diplomas: DiplomaItem[] = await Promise.all(
      (diplomaTeachers ?? []).map(async (row) => {
        const t = row as {
          id: string;
          name?: string | null;
          user_id?: string | null;
          diploma_url?: string | null;
          verification_level?: number | null;
          identity_verified?: boolean | null;
          stripe_identity_status?: string | null;
        };
        const path = t.diploma_url ?? "";
        let signedUrl: string | null = null;
        if (path) {
          const { data: signed } = await admin.storage
            .from(DIPLOMA_BUCKET)
            .createSignedUrl(path, SIGNED_URL_TTL);
          signedUrl = signed?.signedUrl ?? null;
        }
        return {
          teacherId: t.id,
          teacherName: t.name ?? "?",
          teacherEmail: t.user_id ? (emailMap.get(t.user_id) ?? null) : null,
          diplomaPath: path,
          signedUrl,
          verificationLevel: t.verification_level ?? null,
          identityVerified: Boolean(t.identity_verified),
          stripeIdentityStatus: t.stripe_identity_status ?? null,
        };
      }),
    );

    type CredentialItem = {
      credentialId: string;
      teacherId: string;
      teacherName: string;
      teacherEmail: string | null;
      type: string;
      title: string;
      institutionName: string | null;
      country: string | null;
      issuedYear: number | null;
      verificationMethod: string | null;
      publicLabel: string | null;
      createdAt: string | null;
    };

    const credentials: CredentialItem[] = (pendingCreds ?? []).map((row) => {
      const c = row as {
        id: string;
        teacher_id: string;
        type?: string | null;
        title?: string | null;
        institution_name?: string | null;
        country?: string | null;
        issued_year?: number | null;
        verification_method?: string | null;
        public_label?: string | null;
        created_at?: string | null;
      };
      const teacherRow = credTeacherMap.get(c.teacher_id) as
        | { id: string; name?: string | null; user_id?: string | null }
        | undefined;
      return {
        credentialId: c.id,
        teacherId: c.teacher_id,
        teacherName: teacherRow?.name ?? "?",
        teacherEmail: teacherRow?.user_id ? (emailMap.get(teacherRow.user_id) ?? null) : null,
        type: c.type ?? "degree",
        title: c.title ?? "—",
        institutionName: c.institution_name ?? null,
        country: c.country ?? null,
        issuedYear: c.issued_year ?? null,
        verificationMethod: c.verification_method ?? null,
        publicLabel: c.public_label ?? null,
        createdAt: c.created_at ?? null,
      };
    });

    return NextResponse.json({ diplomas, credentials });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    console.error("[admin/review] GET error:", msg, e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST — approve or reject a diploma / credential ────────────────────────────

type ReviewBody = {
  kind: "diploma" | "credential";
  action: "approve" | "reject";
  teacherId?: string;
  credentialId?: string;
  publicLabel?: string;
  confidenceLevel?: string;
  reviewerNotes?: string;
};

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { user: adminUser, admin } = auth;

  let body: ReviewBody;
  try {
    body = (await req.json()) as ReviewBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const { kind, action, teacherId, credentialId, publicLabel, confidenceLevel, reviewerNotes } = body;

  if (!kind || !action) {
    return NextResponse.json({ error: "kind et action sont requis." }, { status: 400 });
  }
  if (kind !== "diploma" && kind !== "credential") {
    return NextResponse.json({ error: "kind doit être diploma ou credential." }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action doit être approve ou reject." }, { status: 400 });
  }

  const now = new Date().toISOString();

  try {
    // ── Diploma ──────────────────────────────────────────────────────────────
    if (kind === "diploma") {
      if (!teacherId?.trim()) {
        return NextResponse.json({ error: "teacherId requis pour diploma." }, { status: 400 });
      }

      // Fetch current teacher to compute new verification_level
      const { data: teacher, error: tErr } = await admin
        .from("teachers")
        .select("id, verification_level")
        .eq("id", teacherId)
        .maybeSingle();

      if (tErr || !teacher) {
        return NextResponse.json({ error: "Professeur introuvable." }, { status: 404 });
      }

      const currentLevel = Number((teacher as { verification_level?: number | null }).verification_level ?? 0);

      if (action === "approve") {
        // Set diploma_verified = true and bump stored verification_level to at least 3.
        // getVerificationLevel() in lib/verification.ts computes MAX(base, stored), so
        // storing 3 here ensures the teacher reaches Level 3 even before a page refresh.
        const newLevel = Math.max(currentLevel, 3);
        const { error: upErr } = await admin
          .from("teachers")
          .update({ diploma_verified: true, verification_level: newLevel, updated_at: now })
          .eq("id", teacherId);
        if (upErr) throw upErr;
        console.log(
          `[admin/review] diploma APPROVED teacher=${teacherId} admin=${adminUser.id} notes=${reviewerNotes ?? "—"}`,
        );
      } else {
        // Reject: mark diploma_verified false. Preserve diploma_url so the teacher
        // can see their file was reviewed and resubmit a corrected version.
        const { error: upErr } = await admin
          .from("teachers")
          .update({ diploma_verified: false, updated_at: now })
          .eq("id", teacherId);
        if (upErr) throw upErr;
        console.log(
          `[admin/review] diploma REJECTED teacher=${teacherId} admin=${adminUser.id} notes=${reviewerNotes ?? "—"}`,
        );
      }

      return NextResponse.json({ ok: true });
    }

    // ── Credential ───────────────────────────────────────────────────────────
    if (kind === "credential") {
      if (!credentialId?.trim()) {
        return NextResponse.json({ error: "credentialId requis pour credential." }, { status: 400 });
      }

      // Fetch credential to know type and teacher_id
      const { data: cred, error: cErr } = await admin
        .from("teacher_credentials")
        .select("id, teacher_id, type, title, public_label")
        .eq("id", credentialId)
        .maybeSingle();

      if (cErr || !cred) {
        return NextResponse.json({ error: "Qualification introuvable." }, { status: 404 });
      }

      const credRow = cred as {
        id: string;
        teacher_id: string;
        type: string;
        title: string;
        public_label: string | null;
      };

      if (action === "approve") {
        const resolvedLabel =
          publicLabel?.trim() || credRow.public_label?.trim() || credRow.title;
        const resolvedConfidence = confidenceLevel?.trim() || "medium";

        const { error: upErr } = await admin
          .from("teacher_credentials")
          .update({
            verification_status: "verified",
            verified_at: now,
            confidence_level: resolvedConfidence,
            public_label: resolvedLabel,
            updated_at: now,
          })
          .eq("id", credentialId);
        if (upErr) throw upErr;

        // If the credential is a degree/certificate/license, also mark the teacher's
        // diploma as verified and bump verification_level to at least 3.
        const diplomaTypes = new Set(["degree", "certificate", "license"]);
        if (diplomaTypes.has(credRow.type)) {
          const { data: teacher } = await admin
            .from("teachers")
            .select("verification_level")
            .eq("id", credRow.teacher_id)
            .maybeSingle();
          const currentLevel = Number(
            (teacher as { verification_level?: number | null } | null)?.verification_level ?? 0,
          );
          const newLevel = Math.max(currentLevel, 3);
          await admin
            .from("teachers")
            .update({ diploma_verified: true, verification_level: newLevel, updated_at: now })
            .eq("id", credRow.teacher_id);
        }

        console.log(
          `[admin/review] credential APPROVED id=${credentialId} teacher=${credRow.teacher_id} admin=${adminUser.id} confidence=${resolvedConfidence}`,
        );
      } else {
        const { error: upErr } = await admin
          .from("teacher_credentials")
          .update({ verification_status: "rejected", updated_at: now })
          .eq("id", credentialId);
        if (upErr) throw upErr;
        console.log(
          `[admin/review] credential REJECTED id=${credentialId} teacher=${credRow.teacher_id} admin=${adminUser.id} notes=${reviewerNotes ?? "—"}`,
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "kind non reconnu." }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    console.error("[admin/review] POST error:", msg, e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
