/**
 * Domain types for public.teacher_offers.
 *
 * Product labels (UI lands in later PRs):
 *   FR student: Offres de cours
 *   FR teacher: Mes offres de cours
 *   EN: Course offers / Offers
 *   ES: Ofertas de cursos / Ofertas
 *
 * API DTO types are the teacher-dashboard contract. Checkout/booking still
 * uses legacy teacher price fields until later PRs.
 */

import type { TeacherOfferPolicyPreference } from "./cancellationPreferences";

export type { TeacherOfferPolicyPreference } from "./cancellationPreferences";

export {
  DEFAULT_TEACHER_OFFER_POLICY_PREFERENCE,
  TEACHER_OFFER_POLICY_PREFERENCES,
  isTeacherOfferPolicyPreference,
  noticeHoursForTeacherOfferPolicyPreference,
  parseTeacherOfferPolicyPreference,
} from "./cancellationPreferences";

/** Defensive sanity cap only. Product plan/founder published-offer limits are implemented in a later PR. */
export const TEACHER_OFFERS_SANITY_CAP = 50;

export const TEACHER_OFFER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Charge currency stored on teacher_offers. Display FX (USD/UYU/…) is not a charge currency. */
export type TeacherOfferCurrency = "CAD";

export const TEACHER_OFFER_CURRENCIES = ["CAD"] as const satisfies readonly TeacherOfferCurrency[];

export type TeacherOfferType =
  | "private_lesson"
  | "intro_session"
  | "package"
  | "assessment"
  | "workshop"
  | "group_class"
  | "cohort"
  | "self_paced_bridge";

export const TEACHER_OFFER_MVP_TYPES = [
  "private_lesson",
  "intro_session",
  "package",
  "assessment",
] as const satisfies readonly TeacherOfferType[];

export const TEACHER_OFFER_TYPES = [
  "private_lesson",
  "intro_session",
  "package",
  "assessment",
  "workshop",
  "group_class",
  "cohort",
  "self_paced_bridge",
] as const satisfies readonly TeacherOfferType[];

export type TeacherOfferFormat = "online" | "in_person" | "home" | "hybrid";

export const TEACHER_OFFER_FORMATS = [
  "online",
  "in_person",
  "home",
  "hybrid",
] as const satisfies readonly TeacherOfferFormat[];

export type TeacherOfferStatus = "draft" | "published" | "paused" | "archived";

export const TEACHER_OFFER_STATUSES = [
  "draft",
  "published",
  "paused",
  "archived",
] as const satisfies readonly TeacherOfferStatus[];

/** Matches teacher_offers.discipline_id CHECK: taxonomy ids, not translated labels. */
export const TEACHER_OFFER_DISCIPLINE_ID_PATTERN = /^[a-z0-9_]{1,80}$/;

export function isTeacherOfferDisciplineId(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return TEACHER_OFFER_DISCIPLINE_ID_PATTERN.test(value);
}

export type TeacherOffer = {
  id: string;
  teacherId: string;
  createdBy: string | null;
  title: string;
  slug: string | null;
  description: string | null;
  shortDescription: string | null;
  disciplineId: string | null;
  specialite: string | null;
  offerType: TeacherOfferType;
  format: TeacherOfferFormat;
  status: TeacherOfferStatus;
  imageUrl: string | null;
  priceCents: number;
  currency: TeacherOfferCurrency;
  durationMinutes: number | null;
  sessionCount: number | null;
  capacityMin: number | null;
  capacityMax: number | null;
  level: string | null;
  ageMin: number | null;
  ageMax: number | null;
  locationMode: TeacherOfferFormat | null;
  requiresIdentity: boolean;
  requiresManualConfirmation: boolean;
  cancellationPreference: TeacherOfferPolicyPreference;
  reschedulePreference: TeacherOfferPolicyPreference;
  publishedAt: string | null;
  pausedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Safe teacher-dashboard payload. Never include address, Stripe, or created_by. */
export type TeacherOfferDto = {
  id: string;
  teacherId: string;
  title: string;
  slug: string | null;
  shortDescription: string | null;
  description: string | null;
  disciplineId: string | null;
  specialite: string | null;
  offerType: TeacherOfferType;
  format: TeacherOfferFormat;
  status: TeacherOfferStatus;
  imageUrl: string | null;
  priceCents: number;
  currency: TeacherOfferCurrency;
  durationMinutes: number | null;
  sessionCount: number | null;
  capacityMin: number | null;
  capacityMax: number | null;
  level: string | null;
  ageMin: number | null;
  ageMax: number | null;
  requiresIdentity: boolean;
  requiresManualConfirmation: boolean;
  cancellationPreference: TeacherOfferPolicyPreference;
  reschedulePreference: TeacherOfferPolicyPreference;
  publishedAt: string | null;
  pausedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeacherOfferCreateInput = {
  title: string;
  slug: string | null;
  shortDescription: string | null;
  description: string | null;
  disciplineId: string | null;
  specialite: string | null;
  offerType: TeacherOfferType;
  format: TeacherOfferFormat;
  status: Extract<TeacherOfferStatus, "draft" | "published">;
  imageUrl: string | null;
  priceCents: number;
  currency: TeacherOfferCurrency;
  durationMinutes: number | null;
  sessionCount: number | null;
  capacityMin: number | null;
  capacityMax: number | null;
  level: string | null;
  ageMin: number | null;
  ageMax: number | null;
  requiresIdentity: boolean;
  requiresManualConfirmation: boolean;
  cancellationPreference: TeacherOfferPolicyPreference;
  reschedulePreference: TeacherOfferPolicyPreference;
};

export type TeacherOfferUpdateInput = {
  title?: string;
  slug?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  disciplineId?: string | null;
  specialite?: string | null;
  offerType?: TeacherOfferType;
  format?: TeacherOfferFormat;
  status?: TeacherOfferStatus;
  imageUrl?: string | null;
  priceCents?: number;
  currency?: TeacherOfferCurrency;
  durationMinutes?: number | null;
  sessionCount?: number | null;
  capacityMin?: number | null;
  capacityMax?: number | null;
  level?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  requiresIdentity?: boolean;
  requiresManualConfirmation?: boolean;
  cancellationPreference?: TeacherOfferPolicyPreference;
  reschedulePreference?: TeacherOfferPolicyPreference;
};
