import type { Teacher } from "@/types";
import type { TranslationKey } from "@/lib/translations";
import { haversineDistance } from "@/lib/geo";
import { getVerificationLevel, type VerificationLevel } from "@/lib/verification";
import { formatTeacherCardShortName, teacherCardLocationPlace } from "@/lib/teacherDisplayName";

export type TeacherListingCardVariant = "landing" | "search";

export type TeacherListingCardModel = {
  variant: TeacherListingCardVariant;
  cardShortName: string;
  verificationLevel: VerificationLevel;
  distanceKm: number | null;
  distancePrimary: string;
  distanceLineIsGeoHint: boolean;
  neighborhoodHint: string | null;
  showNeighborhoodSubline: boolean;
  formatSummary: string;
  formatLabels: string[];
  bioOneLine: string;
  availabilityHint: string;
  firstAvailabilitySlot: string | null;
  hasAvailabilitySlots: boolean;
  showVerifiedTag: boolean;
  showIntroBadge: boolean;
  introDuration: number;
  showEnterpriseTrusted: boolean;
  showViewProfileAffordance: boolean;
  showBio: boolean;
  showAvailabilityStrip: boolean;
  showLandingAvailableChip: boolean;
};

export function trimTeacherCardBio(bio: string): string {
  const s = bio.replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length <= 100) return s;
  return `${s.slice(0, 100).trim()}…`;
}

export function landingCardFormatSummary(teacher: Teacher, t: (k: TranslationKey) => string): string {
  const m = teacher.teachingMode;
  const homeOn = teacher.homeLessonEnabled === true;
  const home = t("marketplaceTeachingAtHomeShort");
  const inPerson = t("teachingFormatInPerson");
  const online = t("teachingFormatOnline");
  const mixte = t("marketplaceTeachingMixteShort");

  if (m === "online") return online;
  if (m === "home") return home;
  if (m === "person") return homeOn ? `${home} / ${inPerson}` : inPerson;
  if (m === "both") return homeOn ? `${home} / ${mixte}` : mixte;
  if (m === "all") return homeOn ? `${home} / ${mixte}` : mixte;
  return mixte;
}

export function searchCardFormatLabels(teacher: Teacher, t: (k: TranslationKey) => string): string[] {
  const supportsOnline = ["online", "both", "all"].includes(teacher.teachingMode);
  const supportsInPerson = ["person", "both", "all"].includes(teacher.teachingMode);
  const supportsHome = Boolean(teacher.homeLessonEnabled);
  return [
    supportsOnline ? t("bookingOnline") : null,
    supportsInPerson ? t("inPerson") : null,
    supportsHome ? t("modeHome") : null,
  ].filter(Boolean) as string[];
}

export function computeCardDistanceKm(
  teacher: Teacher,
  distanceKm: number | null | undefined,
  geo: { lat: number; lng: number } | null | undefined,
): number | null {
  if (distanceKm != null && Number.isFinite(distanceKm)) {
    return Math.round(distanceKm);
  }
  if (geo && teacher.location?.lat != null && teacher.location?.lng != null) {
    return Math.round(
      haversineDistance(geo.lat, geo.lng, teacher.location.lat as number, teacher.location.lng as number),
    );
  }
  return null;
}

export function buildDistancePrimaryLine(
  teacher: Teacher,
  distKm: number | null,
  t: (k: TranslationKey) => string,
): { distancePrimary: string; distanceLineIsGeoHint: boolean; neighborhoodHint: string | null; placeFallback: string | null } {
  const neighborhoodHint = teacher.location?.neighborhood?.trim() || null;
  const placeFallback = teacherCardLocationPlace(teacher);
  const distancePrimary =
    distKm != null
      ? t("distanceFromYouEmphasis").replace("{{n}}", String(distKm))
      : placeFallback
        ? t("teacherCardBasedInPlace").replace("{{place}}", placeFallback)
        : neighborhoodHint
          ? t("teacherCardNearPlace").replace("{{place}}", neighborhoodHint)
          : t("teacherCardDistanceNeedGeo");
  const distanceLineIsGeoHint = distKm == null && !placeFallback && !neighborhoodHint;
  return { distancePrimary, distanceLineIsGeoHint, neighborhoodHint, placeFallback };
}

export function resolveTeacherListingCardModel({
  teacher,
  variant,
  t,
  distanceKm,
  geo,
}: {
  teacher: Teacher;
  variant: TeacherListingCardVariant;
  t: (k: TranslationKey) => string;
  distanceKm?: number | null;
  geo?: { lat: number; lng: number } | null;
}): TeacherListingCardModel {
  const verificationLevel = getVerificationLevel({
    plan: teacher.profilePlan,
    identity_verified: teacher.identityVerified,
    diploma_verified: teacher.diplomaVerified,
    is_verified: teacher.isVerified,
    verification_level: teacher.verificationLevel ?? null,
  });

  const distKm = computeCardDistanceKm(teacher, distanceKm, geo);
  const { distancePrimary, distanceLineIsGeoHint, neighborhoodHint } = buildDistancePrimaryLine(teacher, distKm, t);

  const hasAvailabilitySlots = Array.isArray(teacher.availability) && teacher.availability.length > 0;
  const availabilityHint = hasAvailabilitySlots
    ? teacher.availability!.slice(0, 2).join(" · ")
    : t("availabilityHintGeneric");
  const firstAvailabilitySlot = teacher.availability?.[0] ? String(teacher.availability[0]) : null;

  const bioOneLine =
    typeof teacher.bio === "string" && teacher.bio.trim() ? trimTeacherCardBio(teacher.bio) : "";

  return {
    variant,
    cardShortName: formatTeacherCardShortName(teacher.name),
    verificationLevel,
    distanceKm: distKm,
    distancePrimary,
    distanceLineIsGeoHint,
    neighborhoodHint,
    showNeighborhoodSubline: distKm != null && Boolean(neighborhoodHint),
    formatSummary: landingCardFormatSummary(teacher, t),
    formatLabels: searchCardFormatLabels(teacher, t),
    bioOneLine,
    availabilityHint,
    firstAvailabilitySlot,
    hasAvailabilitySlots,
    showVerifiedTag: verificationLevel > 0,
    showIntroBadge: Boolean(teacher.introSessionEnabled),
    introDuration: teacher.introSessionDurationMinutes ?? 45,
    showEnterpriseTrusted: String(teacher.profilePlan || "").toLowerCase() === "enterprise",
    showViewProfileAffordance: variant === "search",
    showBio: variant === "landing",
    showAvailabilityStrip: variant === "landing",
    showLandingAvailableChip: variant === "landing" && hasAvailabilitySlots,
  };
}

/** Test helper: which trust signals should be present for a variant. */
export function teacherListingCardTrustSignals(model: TeacherListingCardModel) {
  return {
    verificationBadge: true,
    rating: true,
    locationLine: Boolean(model.distancePrimary),
    price: true,
    teachingFormat: model.variant === "landing" ? Boolean(model.formatSummary) : model.formatLabels.length > 0,
    introBadge: model.showIntroBadge,
    viewProfile: model.showViewProfileAffordance,
    bio: model.showBio,
    availability: model.showAvailabilityStrip,
  };
}
