import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type Body = {
  email?: string;
  feature?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const feature = typeof body?.feature === "string" ? body.feature.trim().slice(0, 120) : "";
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Courriel invalide." }, { status: 400 });
    }
    if (!feature) {
      return NextResponse.json({ error: "Feature requise." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.from("waitlist").insert({ email, feature });
    if (error) {
      console.error("[waitlist]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[waitlist]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
