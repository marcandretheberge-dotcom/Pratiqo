import {
  bookingHasOfferSnapshotIntent,
  isOfferSnapshotCheckoutEnabled,
  parseBookingOfferSnapshotCheckoutRow,
  type BookingOfferSnapshotCheckoutRow,
  type ParsedBookingOfferSnapshotCheckout,
} from "@/lib/offers/offerSnapshotCheckout";
import {
  computeBookingChargeCents,
  type BookingChargeInput,
  type BookingChargeTeacher,
} from "@/lib/pricing/bookingCharge";

export type BookingCheckoutPricingSource = "offer_snapshot" | "legacy_teacher_price";

export type ResolveBookingCheckoutPriceError =
  | "offer_snapshot_checkout_disabled"
  | "incomplete_offer_snapshot"
  | "unsupported_offer_type_for_checkout"
  | "invalid_offer_snapshot_price"
  | "invalid_currency"
  | "legacy_price_unavailable";

export type ResolvedBookingCheckoutPrice = {
  source: BookingCheckoutPricingSource;
  amountCents: number;
  currency: "CAD";
  label: string;
  metadata: {
    pricing_source: BookingCheckoutPricingSource;
    teacher_offer_id?: string;
    teacher_offer_snapshot_version?: string;
    teacher_offer_type_snapshot?: string;
    teacher_offer_format_snapshot?: string;
  };
  offerSnapshot?: ParsedBookingOfferSnapshotCheckout;
};

export type ResolveBookingCheckoutPriceResult =
  | { ok: true; pricing: ResolvedBookingCheckoutPrice }
  | { ok: false; error: ResolveBookingCheckoutPriceError };

function legacyLessonLabel(lessonType: string): string {
  return lessonType === "intro" ? "Séance d’introduction" : "Cours";
}

function legacyModeLabel(teachingMode: string): string {
  if (teachingMode === "domicile") return "À domicile";
  if (teachingMode === "online") return "En ligne";
  return "En studio";
}

function offerTypeLabel(offerType: ParsedBookingOfferSnapshotCheckout["offerType"]): string {
  switch (offerType) {
    case "private_lesson":
      return "Cours privé";
    case "intro_session":
      return "Séance d’introduction";
    case "assessment":
      return "Évaluation";
    default:
      return "Offre de cours";
  }
}

function offerFormatLabel(format: ParsedBookingOfferSnapshotCheckout["format"]): string {
  switch (format) {
    case "online":
      return "En ligne";
    case "in_person":
      return "En studio";
    case "home":
      return "À domicile";
    case "hybrid":
      return "Hybride";
    default:
      return "";
  }
}

export function resolveBookingCheckoutPrice(args: {
  booking: BookingOfferSnapshotCheckoutRow & BookingChargeInput;
  teacher: BookingChargeTeacher;
  teacherName: string;
}): ResolveBookingCheckoutPriceResult {
  if (!bookingHasOfferSnapshotIntent(args.booking)) {
    const amountCents = computeBookingChargeCents(args.teacher, args.booking);
    if (amountCents <= 0) {
      return { ok: false, error: "legacy_price_unavailable" };
    }
    const lessonType = (args.booking.lesson_type || "regular").toLowerCase();
    const teachingMode = (args.booking.teaching_mode || "person").toLowerCase();
    return {
      ok: true,
      pricing: {
        source: "legacy_teacher_price",
        amountCents,
        currency: "CAD",
        label: `${legacyLessonLabel(lessonType)} avec ${args.teacherName} (${legacyModeLabel(teachingMode)})`,
        metadata: {
          pricing_source: "legacy_teacher_price",
        },
      },
    };
  }

  if (!isOfferSnapshotCheckoutEnabled()) {
    return { ok: false, error: "offer_snapshot_checkout_disabled" };
  }

  const parsed = parseBookingOfferSnapshotCheckoutRow(args.booking);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const { snapshot } = parsed;
  const formatLabel = offerFormatLabel(snapshot.format);
  const labelParts = [snapshot.title, offerTypeLabel(snapshot.offerType)];
  if (formatLabel) labelParts.push(formatLabel);
  const label = `${labelParts.join(" · ")} avec ${args.teacherName}`;

  return {
    ok: true,
    pricing: {
      source: "offer_snapshot",
      amountCents: snapshot.priceCents,
      currency: "CAD",
      label,
      metadata: {
        pricing_source: "offer_snapshot",
        teacher_offer_id: snapshot.teacherOfferId,
        teacher_offer_type_snapshot: snapshot.offerType,
        teacher_offer_format_snapshot: snapshot.format,
        ...(snapshot.snapshotVersion != null
          ? { teacher_offer_snapshot_version: String(snapshot.snapshotVersion) }
          : {}),
      },
      offerSnapshot: snapshot,
    },
  };
}
