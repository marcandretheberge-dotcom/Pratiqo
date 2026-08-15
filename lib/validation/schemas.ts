import { z } from "zod";
import { REQUESTED_RESOLUTIONS, SUPPORT_CASE_CATEGORIES } from "@/lib/supportCases";

const supportCategoryEnum = z.enum(SUPPORT_CASE_CATEGORIES);
const requestedResolutionEnum = z.enum(REQUESTED_RESOLUTIONS);

/** Public waitlist signup */
export const waitlistPostSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Courriel invalide." })),
  feature: z
    .string()
    .trim()
    .min(1, { message: "Feature requise." })
    .max(120, { message: "Feature trop longue." }),
});

/**
 * Teacher AI bio helper. Available during onboarding AND for already-launched
 * teachers (Teacher Launch Center, account edit, Trust & Visibility surfaces).
 *
 * - `discipline` stays required so the prompt always has subject-matter context.
 * - `specialite` is the teacher's specialty (optional).
 * - `notes` lets the teacher seed the AI with their own rough notes — we ask
 *   the model to improve them rather than ignore them. Capped to keep prompt
 *   cost predictable.
 * - `tone` lets the teacher request a particular flavor. The route maps each
 *   tone to a small instruction snippet; unknown values fall back to neutral.
 * - `locale` lets the route generate copy in the teacher's UI language instead
 *   of always defaulting to French.
 */
export const aiDescriptionTones = ["neutral", "warm", "professional", "shorter"] as const;
export type AiDescriptionTone = (typeof aiDescriptionTones)[number];

export const aiDescriptionPostSchema = z.object({
  discipline: z.string().trim().min(1, { message: "Discipline requise" }).max(200),
  specialite: z.string().trim().max(200).optional().default(""),
  notes: z.string().trim().max(800).optional().default(""),
  tone: z.enum(aiDescriptionTones).optional().default("neutral"),
  locale: z.enum(["fr", "en", "es"]).optional().default("fr"),
});

/** Authenticated support case creation */
export const supportCasePostSchema = z.object({
  booking_id: z.string().trim().min(1).max(64),
  category: supportCategoryEnum,
  description: z.string().trim().min(10).max(4000),
  requested_resolution: z.union([requestedResolutionEnum, z.null()]).optional(),
  evidence_url: z
    .preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : v),
      z.string().trim().url().max(2048).optional(),
    )
    .optional(),
});

/** Authenticated message between users */
export const messageSendPostSchema = z.object({
  receiver_id: z.string().trim().uuid({ error: "receiver_id must be a valid UUID." }),
  content: z.string().trim().min(1, { message: "content is required." }).max(12_000),
});

/** Student review for a completed booking */
export const reviewPostSchema = z.object({
  bookingId: z.string().trim().uuid({ message: "bookingId manquant" }),
  rating: z.coerce.number().int().min(1).max(5),
  body: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v.trim() : ""))
    .pipe(z.string().max(12_000)),
});

const disciplineRowSchema = z.object({
  discipline_id: z.string().trim().min(1).max(64),
  specialite: z.string().trim().max(200).optional().default(""),
});

/** Onboarding completion — permissive on unknown keys, validates known fields only */
export const onboardingCompletePostSchema = z
  .object({
    role: z.enum(["teacher", "student"]).optional(),
    name: z.string().max(200).optional(),
    photo_url: z.union([z.string().max(2048), z.null()]).optional(),
    bio: z.string().max(5000).optional(),
    teaching_since: z.coerce.number().int().min(1950).max(2035).nullable().optional(),
    categories: z.array(z.string().trim().max(100)).max(20).optional(),
    discipline: z.string().max(200).optional(),
    disciplines: z.array(disciplineRowSchema).max(5).optional(),
    teaching_mode: z.enum(["person", "online", "both"]).optional(),
    hourly_rate: z.coerce.number().finite().min(20).max(500).optional(),
    levels: z.array(z.string().max(80)).max(10).optional(),
    availability: z.array(z.string().max(100)).max(128).optional(),
    city: z.string().trim().max(120).optional(),
    home_lesson_enabled: z.coerce.boolean().optional(),
    home_lesson_radius_km: z.coerce.number().finite().min(5).max(50).optional(),
    home_lesson_price: z.coerce.number().finite().min(20).max(500).nullable().optional(),
    tax_status_acknowledged: z.coerce.boolean().optional(),
    no_exclusivity_acknowledged: z.coerce.boolean().optional(),
    no_income_guarantee_acknowledged: z.coerce.boolean().optional(),
  })
  .passthrough();

/** Teacher credential submission — teacher_id resolved server-side from auth */
export const teacherCredentialPostSchema = z.object({
  type: z.enum(["degree", "certificate", "license", "experience", "portfolio"]),
  title: z.string().trim().min(1, { message: "Le titre est requis." }).max(200),
  institution_name: z.string().trim().max(200).optional().nullable(),
  country: z.string().trim().max(2).optional().nullable(),
  issued_year: z.coerce
    .number()
    .int()
    .min(1900, { message: "Année invalide (min 1900)." })
    .max(new Date().getFullYear() + 1, { message: "Année invalide." })
    .optional()
    .nullable(),
  verification_method: z
    .enum([
      "mycreds",
      "document_review",
      "institution_direct",
      "official_registry",
      "reference_check",
      "manual",
    ])
    .default("document_review"),
});

/** Stripe checkout session — shape only; payment math unchanged */
export const stripeCheckoutPostSchema = z
  .object({
    teacher_id: z.string().trim().uuid().optional(),
    amount: z.number().finite().optional(),
    lesson_type: z.enum(["regular", "intro"]).optional(),
    booking_details: z
      .object({
        booking_id: z.string().trim().uuid().optional(),
      })
      .optional(),
    booking_id: z.string().trim().uuid().optional(),
    credits_to_apply: z.coerce.number().finite().min(0).max(1_000_000).optional(),
    learner_profile_id: z.string().trim().uuid().optional(),
  })
  .refine((d) => Boolean(d.booking_details?.booking_id ?? d.booking_id), {
    message: "Expected booking_details.booking_id or booking_id.",
    path: ["booking_id"],
  });
