import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { SITE_URL } from "@/lib/seo/site";

export const runtime = "nodejs";

function publicBase(): string {
  const raw =
    process.env.STRIPE_CHECKOUT_BASE_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    SITE_URL;
  return raw.replace(/\/+$/, "");
}

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
      return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Session invalide ou expirée." }, { status: 401 });
    }

    // ── Fetch teacher row ──────────────────────────────────────────────────
    const admin = getSupabaseAdmin();
    const { data: teacher, error: tErr } = await admin
      .from("teachers")
      .select("id, identity_status, identity_verified")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tErr || !teacher) {
      return NextResponse.json({ error: "Fiche professeur introuvable." }, { status: 404 });
    }

    const teacherId = (teacher as { id: string }).id;
    const identityStatus = (teacher as { identity_status?: string }).identity_status ?? "none";
    const identityVerified = Boolean((teacher as { identity_verified?: boolean }).identity_verified);

    if (identityVerified || identityStatus === "verified") {
      return NextResponse.json({ error: "Identité déjà vérifiée." }, { status: 409 });
    }

    // ── Create Stripe Identity VerificationSession ─────────────────────────
    const returnUrl = `${publicBase()}/teacher/verification?identity=completed`;

    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { teacher_id: teacherId, user_id: user.id },
      options: {
        document: {
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      return_url: returnUrl,
    });

    // ── Mark identity as pending ───────────────────────────────────────────
    await admin
      .from("teachers")
      .update({ identity_status: "pending" })
      .eq("id", teacherId);

    console.log("[verify-identity] session created:", session.id, "teacher:", teacherId);

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    // Stripe throws if Identity is not enabled on the account
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    console.error("[verify-identity]", msg, e);

    // Return a meaningful 503 if Stripe Identity is not activated
    if (
      typeof msg === "string" &&
      (msg.includes("identity") || msg.includes("verification_session"))
    ) {
      return NextResponse.json(
        {
          error:
            "Stripe Identity n'est pas activé sur ce compte. Activez-le dans le tableau de bord Stripe.",
          detail: msg,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
