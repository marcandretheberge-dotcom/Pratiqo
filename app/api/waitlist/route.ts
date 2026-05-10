import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { validateJsonBody } from "@/lib/validation/api";
import { waitlistPostSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const validated = await validateJsonBody(waitlistPostSchema, req);
    if (!validated.ok) return validated.response;
    const { email, feature } = validated.data;

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
