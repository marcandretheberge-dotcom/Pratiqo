import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function publicBase(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.STRIPE_CHECKOUT_BASE_URL?.trim() ||
    "https://pratiqo.ca"
  ).replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: "Configuration manquante." }, { status: 500 });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Session invalide ou expirée." }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    const { data: profile } = await admin
      .from("profiles")
      .select("role, name, email")
      .eq("id", user.id)
      .maybeSingle();

    if ((profile as { role?: string } | null)?.role !== "teacher") {
      return NextResponse.json({ error: "Accès réservé aux professeurs" }, { status: 403 });
    }

    const { data: teacher } = await admin
      .from("teachers")
      .select("id, name, stripe_identity_status, identity_verified")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!teacher) {
      return NextResponse.json({ error: "Profil prof introuvable" }, { status: 404 });
    }

    const t = teacher as {
      id: string;
      name: string;
      stripe_identity_status?: string | null;
      identity_verified?: boolean | null;
    };

    if (t.identity_verified || t.stripe_identity_status === "verified") {
      return NextResponse.json({ error: "Identité déjà vérifiée." }, { status: 409 });
    }

    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        user_id: user.id,
        teacher_id: t.id,
        role: "teacher",
      },
      options: {
        document: {
          require_live_capture: true,
          require_matching_selfie: true,
          allowed_types: ["driving_license", "passport", "id_card"],
        },
      },
      return_url: `${publicBase()}/teacher/verification?status=complete`,
    });

    await admin
      .from("teachers")
      .update({
        stripe_identity_session_id: verificationSession.id,
        stripe_identity_status: "requires_input",
        identity_status: "pending",
      })
      .eq("user_id", user.id);

    return NextResponse.json({ url: verificationSession.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    console.error("[stripe/identity/verify]", msg, e);

    if (typeof msg === "string" && (msg.includes("identity") || msg.includes("verification_session"))) {
      return NextResponse.json(
        { error: "Stripe Identity n'est pas activé sur ce compte.", detail: msg },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
