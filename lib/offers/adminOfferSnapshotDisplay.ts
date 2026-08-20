/**
 * Admin read-only display helpers for booking offer snapshots.
 * Uses immutable booking snapshot columns only — never live teacher_offers.
 */

import { formatAccountingDisplay } from "@/lib/currency/format";
import type { TranslationKey } from "@/lib/i18n/types";
import { getDisciplineLabel } from "@/lib/taxonomy/disciplines";
import {
  TEACHER_OFFER_CURRENCIES,
  TEACHER_OFFER_FORMATS,
  TEACHER_OFFER_TYPES,
  type TeacherOfferCurrency,
  type TeacherOfferFormat,
  type TeacherOfferType,
} from "./types";
import { formatTeacherOfferFormatLabel, formatTeacherOfferTypeLabel } from "./display";

export type AdminOfferSnapshotTranslator = (key: TranslationKey) => string;

export type AdminOfferSnapshotDto = {
  teacherOfferId: string;
  title: string;
  type: TeacherOfferType;
  format: TeacherOfferFormat;
  priceCents: number;
  currency: TeacherOfferCurrency;
  durationMinutes: number | null;
  sessionCount: number | null;
  disciplineId: string | null;
  specialite: string | null;
  shortDescription: string | null;
  snapshotVersion: number | null;
};

export type AdminPricingSource =
  | "offer_snapshot"
  | "legacy_teacher_price"
  | "package_credit"
  | "unknown";

export type AdminOfferSnapshotViewState =
  | { kind: "none" }
  | { kind: "complete"; snapshot: AdminOfferSnapshotDto }
  | { kind: "incomplete"; teacherOfferId: string | null };

export type BookingOfferSnapshotRowInput = {
  teacher_offer_id?: string | null;
  teacher_offer_title_snapshot?: string | null;
  teacher_offer_type_snapshot?: string | null;
  teacher_offer_format_snapshot?: string | null;
  teacher_offer_price_cents_snapshot?: number | string | null;
  teacher_offer_currency_snapshot?: string | null;
  teacher_offer_duration_minutes_snapshot?: number | string | null;
  teacher_offer_session_count_snapshot?: number | string | null;
  teacher_offer_discipline_id_snapshot?: string | null;
  teacher_offer_specialite_snapshot?: string | null;
  teacher_offer_short_description_snapshot?: string | null;
  teacher_offer_snapshot_version?: number | string | null;
  booking_payment_source?: string | null;
  package_entitlement_id?: string | null;
  package_redemption_id?: string | null;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

function isOfferType(value: unknown): value is TeacherOfferType {
  return typeof value === "string" && (TEACHER_OFFER_TYPES as readonly string[]).includes(value);
}

function isFormat(value: unknown): value is TeacherOfferFormat {
  return typeof value === "string" && (TEACHER_OFFER_FORMATS as readonly string[]).includes(value);
}

function isCurrency(value: unknown): value is TeacherOfferCurrency {
  return typeof value === "string" && (TEACHER_OFFER_CURRENCIES as readonly string[]).includes(value);
}

export function bookingHasOfferSnapshotIntent(row: BookingOfferSnapshotRowInput): boolean {
  return Boolean(asTrimmedString(row.teacher_offer_id));
}

export function hasCompleteOfferSnapshot(row: BookingOfferSnapshotRowInput): boolean {
  return mapAdminOfferSnapshotFromBookingRow(row).kind === "complete";
}

export function mapAdminOfferSnapshotFromBookingRow(
  row: BookingOfferSnapshotRowInput,
): AdminOfferSnapshotViewState {
  const teacherOfferId = asTrimmedString(row.teacher_offer_id);
  if (!teacherOfferId) return { kind: "none" };

  const title = asTrimmedString(row.teacher_offer_title_snapshot);
  const offerType = row.teacher_offer_type_snapshot;
  const format = row.teacher_offer_format_snapshot;
  const currency = row.teacher_offer_currency_snapshot;
  const priceCents = asInt(row.teacher_offer_price_cents_snapshot);
  const snapshotVersionRaw = row.teacher_offer_snapshot_version;
  const snapshotVersion =
    snapshotVersionRaw == null || snapshotVersionRaw === ""
      ? null
      : asInt(snapshotVersionRaw);

  if (
    !title ||
    !isOfferType(offerType) ||
    !isFormat(format) ||
    !isCurrency(currency) ||
    priceCents == null ||
    priceCents < 0
  ) {
    return { kind: "incomplete", teacherOfferId };
  }

  if (snapshotVersion != null && snapshotVersion < 1) {
    return { kind: "incomplete", teacherOfferId };
  }

  const durationRaw = row.teacher_offer_duration_minutes_snapshot;
  const sessionRaw = row.teacher_offer_session_count_snapshot;

  return {
    kind: "complete",
    snapshot: {
      teacherOfferId,
      title,
      type: offerType,
      format,
      priceCents,
      currency,
      durationMinutes:
        durationRaw == null || durationRaw === "" ? null : asInt(durationRaw),
      sessionCount: sessionRaw == null || sessionRaw === "" ? null : asInt(sessionRaw),
      disciplineId: asTrimmedString(row.teacher_offer_discipline_id_snapshot),
      specialite: asTrimmedString(row.teacher_offer_specialite_snapshot),
      shortDescription: asTrimmedString(row.teacher_offer_short_description_snapshot),
      snapshotVersion,
    },
  };
}

export function deriveAdminPricingSource(
  snapshotState: AdminOfferSnapshotViewState,
  metadataPricingSource?: string | null,
  bookingPaymentSource?: string | null,
): AdminPricingSource {
  if (bookingPaymentSource === "package_credit" || metadataPricingSource === "package_credit") {
    return "package_credit";
  }
  if (metadataPricingSource === "offer_snapshot") return "offer_snapshot";
  if (metadataPricingSource === "legacy_teacher_price") return "legacy_teacher_price";
  if (snapshotState.kind === "complete") return "offer_snapshot";
  if (snapshotState.kind === "none") return "legacy_teacher_price";
  return "unknown";
}

export function extractPricingSourceFromPaymentMetadata(
  metadata: unknown,
): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).pricing_source;
  return typeof value === "string" ? value : null;
}

export function formatOfferSnapshotPrice(
  priceCents: number,
  locale: string,
  currency = "CAD",
): string {
  return formatAccountingDisplay({
    amount: priceCents / 100,
    sourceCurrency: currency,
    locale,
  }).primary;
}

export function formatOfferSnapshotDuration(
  durationMinutes: number | null | undefined,
  t: AdminOfferSnapshotTranslator,
): string | null {
  if (durationMinutes == null || !Number.isFinite(durationMinutes)) return null;
  return t("adminOfferSnapshotDurationMinutes").replace("{n}", String(durationMinutes));
}

export function formatOfferSnapshotSessionCount(
  sessionCount: number | null | undefined,
  t: AdminOfferSnapshotTranslator,
): string | null {
  if (sessionCount == null || !Number.isFinite(sessionCount)) return null;
  return t("adminOfferSnapshotSessionCount").replace("{n}", String(sessionCount));
}

export function getOfferSnapshotAdminSummary(
  snapshot: AdminOfferSnapshotDto,
  t: AdminOfferSnapshotTranslator,
  locale: string,
): string {
  const parts = [
    snapshot.title,
    formatTeacherOfferTypeLabel(snapshot.type, t),
    formatTeacherOfferFormatLabel(snapshot.format, t),
    formatOfferSnapshotPrice(snapshot.priceCents, locale, snapshot.currency),
  ];
  return parts.filter(Boolean).join(" · ");
}

export function formatAdminPricingSourceLabel(
  source: AdminPricingSource,
  t: AdminOfferSnapshotTranslator,
): string {
  switch (source) {
    case "offer_snapshot":
      return t("adminPaymentSourceOfferSnapshot");
    case "legacy_teacher_price":
      return t("adminPaymentSourceLegacyRate");
    case "package_credit":
      return t("adminPaymentSourcePackageCredit");
    default:
      return t("adminPaymentSourceUnknown");
  }
}

export function formatOfferSnapshotDisciplineLabel(
  disciplineId: string | null | undefined,
  locale: string,
): string | null {
  if (!disciplineId) return null;
  try {
    return getDisciplineLabel(disciplineId, locale);
  } catch {
    return disciplineId;
  }
}

export function paymentAmountDiffersFromSnapshotPrice(input: {
  chargedAmountCents: number | null;
  subtotalCents: number | null;
  snapshotPriceCents: number | null;
  creditsAppliedDollars?: number | null;
}): boolean {
  if (input.snapshotPriceCents == null) return false;
  const compareCents = input.subtotalCents ?? input.chargedAmountCents;
  if (compareCents == null) return false;
  return compareCents !== input.snapshotPriceCents;
}

export function adminOfferSnapshotViewStateFromFields(
  fields: Pick<
    AdminBookingOfferSnapshotFields,
    "offerSnapshot" | "offerSnapshotIncomplete" | "offerSnapshotTeacherOfferId"
  >,
): AdminOfferSnapshotViewState {
  if (fields.offerSnapshotIncomplete) {
    return { kind: "incomplete", teacherOfferId: fields.offerSnapshotTeacherOfferId };
  }
  if (fields.offerSnapshot) {
    return { kind: "complete", snapshot: fields.offerSnapshot };
  }
  return { kind: "none" };
}

export type AdminBookingOfferSnapshotFields = {
  offerSnapshot: AdminOfferSnapshotDto | null;
  offerSnapshotIncomplete: boolean;
  offerSnapshotTeacherOfferId: string | null;
  pricingSource: AdminPricingSource;
  packageEntitlementId: string | null;
  packageRedemptionId: string | null;
  packageRedemptionStatus: string | null;
  packageRedemptionSessionNumber: number | null;
  packageRedemptionReversedAt: string | null;
  packageRedemptionReversalSource: string | null;
};

export const ADMIN_BOOKING_OFFER_SNAPSHOT_SELECT =
  "teacher_offer_id, teacher_offer_title_snapshot, teacher_offer_type_snapshot, teacher_offer_format_snapshot, teacher_offer_price_cents_snapshot, teacher_offer_currency_snapshot, teacher_offer_duration_minutes_snapshot, teacher_offer_session_count_snapshot, teacher_offer_discipline_id_snapshot, teacher_offer_specialite_snapshot, teacher_offer_short_description_snapshot, teacher_offer_cancellation_preference_snapshot, teacher_offer_reschedule_preference_snapshot, teacher_offer_snapshot_version, booking_payment_source, package_entitlement_id, package_redemption_id";

export type AdminPackageRedemptionLite = {
  id: string;
  status: string | null;
  sessionNumber: number | null;
  reversedAt: string | null;
  reversalSource: string | null;
};

export function emptyAdminPackageCreditFields(): Pick<
  AdminBookingOfferSnapshotFields,
  | "packageEntitlementId"
  | "packageRedemptionId"
  | "packageRedemptionStatus"
  | "packageRedemptionSessionNumber"
  | "packageRedemptionReversedAt"
  | "packageRedemptionReversalSource"
> {
  return {
    packageEntitlementId: null,
    packageRedemptionId: null,
    packageRedemptionStatus: null,
    packageRedemptionSessionNumber: null,
    packageRedemptionReversedAt: null,
    packageRedemptionReversalSource: null,
  };
}

export function mapAdminPackageCreditFieldsFromBookingRow(
  row: BookingOfferSnapshotRowInput,
  redemption?: AdminPackageRedemptionLite | null,
): Pick<
  AdminBookingOfferSnapshotFields,
  | "packageEntitlementId"
  | "packageRedemptionId"
  | "packageRedemptionStatus"
  | "packageRedemptionSessionNumber"
  | "packageRedemptionReversedAt"
  | "packageRedemptionReversalSource"
> {
  const entitlementId =
    typeof row.package_entitlement_id === "string" && row.package_entitlement_id.trim()
      ? row.package_entitlement_id
      : null;
  const redemptionId =
    typeof row.package_redemption_id === "string" && row.package_redemption_id.trim()
      ? row.package_redemption_id
      : redemption?.id ?? null;
  return {
    packageEntitlementId: entitlementId,
    packageRedemptionId: redemptionId,
    packageRedemptionStatus: redemption?.status ?? null,
    packageRedemptionSessionNumber: redemption?.sessionNumber ?? null,
    packageRedemptionReversedAt: redemption?.reversedAt ?? null,
    packageRedemptionReversalSource: redemption?.reversalSource ?? null,
  };
}
