import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveEmailLocaleForUser } from "@/lib/email/locale";
import { minimumLessonPriceErrorMessage } from "@/lib/pricing/messages";
import { validateTeacherLessonOffers, type TeacherLessonOfferInput } from "@/lib/pricing/lessonOffer";
import {
  isTeacherMarketSupported,
  marketNotSupportedPayload,
} from "@/lib/config/markets";

export const runtime = "nodejs";

// Bounds mirror the existing onboarding clamp (see app/api/onboarding/complete
// /route.ts) and the canonical zod schema in lib/validation/schemas.ts. They
// are kept here so the dedicated home-lessons UI in /teacher/verification can
// PATCH the radius without rejoining the address-verification path.
const HOME_LESSON_RADIUS_MIN_KM = 5;
const HOME_LESSON_RADIUS_MAX_KM = 50;
const HOME_LESSON_HOURLY_RATE_MIN_CAD = 20;
const HOME_LESSON_HOURLY_RATE_MAX_CAD = 500;

const teacherPricingPatchSchema = z
  .object({
    price_per_lesson: z.coerce.number().finite().optional(),
    // Hourly rate charged when the lesson takes place at the student's home.
    // It REPLACES `price_per_lesson` at checkout (see lib/pricing/bookingCharge
    // `computeBookingChargeCents` and components/BookingModal `hourlyRate`).
    // Allowed range matches the canonical validation schema; `null` clears it.
    home_lesson_price: z
      .union([
        z.coerce
          .number()
          .finite()
          .min(HOME_LESSON_HOURLY_RATE_MIN_CAD)
          .max(HOME_LESSON_HOURLY_RATE_MAX_CAD),
        z.null(),
      ])
      .optional(),
    home_lesson_enabled: z.coerce.boolean().optional(),
    // Max travel radius in km. Kept in lockstep with the address-verify route
    // (app/api/teacher/location/verify) so both paths converge on the same
    // column and clamp range.
    home_lesson_radius_km: z.coerce
      .number()
      .int()
      .min(HOME_LESSON_RADIUS_MIN_KM)
      .max(HOME_LESSON_RADIUS_MAX_KM)
      .optional(),
    intro_session_enabled: z.coerce.boolean().optional(),
    intro_session_price_cents: z.union([z.coerce.number().int(), z.null()]).optional(),
    intro_session_duration_minutes: z.coerce.number().int().positive().optional(),
    intro_session_discount_percent: z.coerce.number().finite().min(0).max(95).optional(),
  })
  .strict();

type TeacherPricingRow = {
  price_per_lesson: number | null;
  home_lesson_enabled: boolean | null;
  home_lesson_price: number | null;
  home_lesson_min_duration: number | null;
  intro_session_enabled: boolean | null;
  intro_session_price_cents: number | null;
  intro_session_duration_minutes: number | null;
  intro_session_discount_percent: number | null;
};

async function getAuthenticatedTeacher(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "Missing Authorization bearer token." }, { status: 401 }) };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { error: NextResponse.json({ error: "Missing Supabase env." }, { status: 500 }) };
  }

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser(token);
  if (userErr || !user) {
    return { error: NextResponse.json({ error: "Invalid or expired session." }, { status: 401 }) };
  }

  const admin = getSupabaseAdmin();
  const { data: teacher, error: teacherErr } = await admin
    .from("teachers")
    .select("id,country_code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherErr || !teacher?.id) {
    return { error: NextResponse.json({ error: "Teacher profile not found." }, { status: 404 }) };
  }

  return {
    user,
    teacherId: teacher.id as string,
    teacherCountryCode: (teacher as { country_code?: string | null }).country_code ?? "",
    admin,
  };
}

function pricingValidationError(locale: Awaited<ReturnType<typeof resolveEmailLocaleForUser>>) {
  return NextResponse.json(
    {
      error: minimumLessonPriceErrorMessage(locale),
      code: "minimum_lesson_price",
    },
    { status: 400 },
  );
}

function mergeTeacherOffer(
  current: TeacherPricingRow,
  patch: z.infer<typeof teacherPricingPatchSchema>,
): TeacherLessonOfferInput {
  return {
    price_per_lesson: patch.price_per_lesson ?? current.price_per_lesson,
    home_lesson_enabled: patch.home_lesson_enabled ?? current.home_lesson_enabled,
    home_lesson_price: patch.home_lesson_price !== undefined ? patch.home_lesson_price : current.home_lesson_price,
    home_lesson_min_duration: current.home_lesson_min_duration,
    intro_session_enabled: patch.intro_session_enabled ?? current.intro_session_enabled,
    intro_session_price_cents:
      patch.intro_session_price_cents !== undefined
        ? patch.intro_session_price_cents
        : current.intro_session_price_cents,
    intro_session_duration_minutes:
      patch.intro_session_duration_minutes ?? current.intro_session_duration_minutes,
    intro_session_discount_percent:
      patch.intro_session_discount_percent ?? current.intro_session_discount_percent,
  };
}

export async function PATCH(req: Request) {
  const auth = await getAuthenticatedTeacher(req);
  if ("error" in auth && auth.error) return auth.error;

  const { user, teacherId, teacherCountryCode, admin } = auth as {
    user: { id: string };
    teacherId: string;
    teacherCountryCode: string;
    admin: ReturnType<typeof getSupabaseAdmin>;
  };

  if (!isTeacherMarketSupported(teacherCountryCode)) {
    return NextResponse.json(marketNotSupportedPayload(teacherCountryCode), { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = teacherPricingPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const locale = await resolveEmailLocaleForUser(admin, user.id);
  const data = parsed.data;

  const { data: currentRow, error: currentErr } = await admin
    .from("teachers")
    .select(
      "price_per_lesson, home_lesson_enabled, home_lesson_price, home_lesson_min_duration, intro_session_enabled, intro_session_price_cents, intro_session_duration_minutes, intro_session_discount_percent",
    )
    .eq("id", teacherId)
    .maybeSingle();

  if (currentErr || !currentRow) {
    return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });
  }

  const mergedOffer = mergeTeacherOffer(currentRow as TeacherPricingRow, data);
  const offerCheck = validateTeacherLessonOffers(mergedOffer);
  if (!offerCheck.ok) {
    return pricingValidationError(locale);
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (data.price_per_lesson !== undefined) {
    updates.price_per_lesson = data.price_per_lesson;
  }
  if (data.home_lesson_price !== undefined) {
    updates.home_lesson_price = data.home_lesson_price;
  }
  if (data.home_lesson_enabled !== undefined) {
    updates.home_lesson_enabled = data.home_lesson_enabled;
  }
  if (data.home_lesson_radius_km !== undefined) {
    updates.home_lesson_radius_km = data.home_lesson_radius_km;
  }
  if (data.intro_session_enabled !== undefined) {
    updates.intro_session_enabled = data.intro_session_enabled;
  }
  if (data.intro_session_price_cents !== undefined) {
    updates.intro_session_price_cents = data.intro_session_price_cents;
  }
  if (data.intro_session_duration_minutes !== undefined) {
    updates.intro_session_duration_minutes = data.intro_session_duration_minutes;
  }
  if (data.intro_session_discount_percent !== undefined) {
    updates.intro_session_discount_percent = data.intro_session_discount_percent;
  }

  const { error } = await admin.from("teachers").update(updates).eq("id", teacherId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
