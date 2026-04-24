import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function publicBase(): string {
  const raw = process.env.APP_BASE_URL?.trim() || process.env.STRIPE_CHECKOUT_BASE_URL?.trim() || "https://pratiqo.ca";
  return trimTrailingSlash(raw);
}

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

    const base = publicBase();
    const admin = getSupabaseAdmin();

    // Ensure teacher row exists (id is text; we use user.id as stable string id)
    const { data: existingTeacher } = await admin
      .from("teachers")
      .select("id, stripe_account_id, name, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const teacherId = (existingTeacher as { id?: string } | null)?.id ?? user.id;
    const teacherName = (existingTeacher as { name?: string } | null)?.name ?? (user.user_metadata?.full_name as string) ?? "Professeur";

    let stripeAccountId = (existingTeacher as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "CA",
        email: user.email ?? undefined,
        business_profile: {
          name: teacherName,
        },
        metadata: {
          pratiqo_user_id: user.id,
          pratiqo_teacher_id: teacherId,
        },
      });
      stripeAccountId = account.id;

      // Create teacher row if missing, otherwise update connect id
      if (!existingTeacher) {
        await admin.from("teachers").insert({
          id: teacherId,
          user_id: user.id,
          name: teacherName,
          discipline: "—",
          category: "Musique",
          price_per_lesson: 50,
          bio: "",
          image_url: (user.user_metadata?.avatar_url as string) || "https://picsum.photos/seed/teacher/400/400",
          availability: [],
          location: {},
          is_verified: false,
          teaching_mode: "both",
          languages: [],
          levels: [],
          stripe_account_id: stripeAccountId,
        });
      } else {
        await admin.from("teachers").update({ stripe_account_id: stripeAccountId }).eq("id", teacherId);
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: "account_onboarding",
      refresh_url: `${base}/onboarding?stripe=refresh`,
      return_url: `${base}/onboarding?stripe=success`,
    });

    return NextResponse.json({ url: accountLink.url, stripe_account_id: stripeAccountId });
  } catch (e) {
    console.error("[stripe/connect]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Stripe Connect error" }, { status: 500 });
  }
}

