import { formatAccountingDisplay } from "@/lib/currency/format";
import type { TranslationKey } from "@/lib/i18n/types";
import { getDisciplineLabel } from "@/lib/taxonomy/disciplines";
import type { PublicTeacherOfferDto } from "./publicTeacherOfferDto";
import type {
  TeacherOfferDto,
  TeacherOfferFormat,
  TeacherOfferStatus,
  TeacherOfferType,
} from "./types";

export type TeacherOfferTranslator = (key: TranslationKey) => string;

export type TeacherOfferStatusAction = "edit" | "view" | "publish" | "pause" | "archive";

const TYPE_LABEL_KEYS: Record<TeacherOfferType, TranslationKey> = {
  private_lesson: "teacherOffersTypePrivateLesson",
  intro_session: "teacherOffersTypeIntro",
  package: "teacherOffersTypePackage",
  assessment: "teacherOffersTypeAssessment",
  workshop: "teacherOffersTypeWorkshop",
  group_class: "teacherOffersTypeGroup",
  cohort: "teacherOffersTypeCohort",
  self_paced_bridge: "teacherOffersTypeSelfPaced",
};

const FORMAT_LABEL_KEYS: Record<TeacherOfferFormat, TranslationKey> = {
  online: "teacherOffersFormatOnline",
  in_person: "teacherOffersFormatInPerson",
  home: "teacherOffersFormatHome",
  hybrid: "teacherOffersFormatHybrid",
};

const STATUS_LABEL_KEYS: Record<TeacherOfferStatus, TranslationKey> = {
  draft: "teacherOffersStatusDraft",
  published: "teacherOffersStatusPublished",
  paused: "teacherOffersStatusPaused",
  archived: "teacherOffersStatusArchived",
};

export function formatTeacherOfferTypeLabel(
  type: TeacherOfferType,
  t: TeacherOfferTranslator,
): string {
  return t(TYPE_LABEL_KEYS[type]);
}

export function formatTeacherOfferFormatLabel(
  format: TeacherOfferFormat,
  t: TeacherOfferTranslator,
): string {
  return t(FORMAT_LABEL_KEYS[format]);
}

export function formatTeacherOfferStatusLabel(
  status: TeacherOfferStatus,
  t: TeacherOfferTranslator,
): string {
  return t(STATUS_LABEL_KEYS[status]);
}

export function formatTeacherOfferPrice(priceCents: number, locale: string): string {
  const amount = Number.isFinite(priceCents) ? priceCents / 100 : 0;
  return formatAccountingDisplay({
    amount,
    sourceCurrency: "CAD",
    locale,
  }).primary;
}

export function formatTeacherOfferDuration(
  durationMinutes: number | null | undefined,
  t: TeacherOfferTranslator,
): string | null {
  if (durationMinutes == null || !Number.isFinite(durationMinutes)) return null;
  return t("teacherOffersMinutes").replace("{n}", String(durationMinutes));
}

export function formatTeacherOfferSessions(
  offer: Pick<TeacherOfferDto, "offerType" | "sessionCount">,
  t: TeacherOfferTranslator,
): string | null {
  if (offer.offerType !== "package" || offer.sessionCount == null) return null;
  return t("teacherOffersSessions").replace("{n}", String(offer.sessionCount));
}

export function formatTeacherOfferCapacity(
  offer: Pick<TeacherOfferDto, "capacityMin" | "capacityMax">,
  t: TeacherOfferTranslator,
): string | null {
  if (offer.capacityMin == null && offer.capacityMax == null) return null;
  if (offer.capacityMin != null && offer.capacityMax != null) {
    return t("teacherOffersCapacityRange")
      .replace("{min}", String(offer.capacityMin))
      .replace("{max}", String(offer.capacityMax));
  }
  const value = offer.capacityMax ?? offer.capacityMin;
  return t("teacherOffersCapacityOne").replace("{n}", String(value));
}

export function formatTeacherOfferDiscipline(
  disciplineId: string | null | undefined,
  locale: string,
): string | null {
  if (!disciplineId) return null;
  const label = getDisciplineLabel(disciplineId, locale);
  return label || null;
}

export function getTeacherOfferStatusActions(status: TeacherOfferStatus): TeacherOfferStatusAction[] {
  if (status === "draft") return ["edit", "publish", "archive"];
  if (status === "published") return ["edit", "pause", "archive"];
  if (status === "paused") return ["edit", "publish", "archive"];
  return ["view"];
}

export function teacherOfferStatusTone(status: TeacherOfferStatus): string {
  if (status === "published") return "bg-teal-50 text-teal-800";
  if (status === "paused") return "bg-amber-50 text-amber-800";
  if (status === "archived") return "bg-slate-100 text-slate-600";
  return "bg-slate-50 text-slate-700";
}

export function teacherOfferApiErrorMessage(
  error: { status: number; error: string },
  t: TeacherOfferTranslator,
): string {
  if (error.error === "invalid_payload") return t("teacherOffersApiInvalid");
  if (error.error === "invalid_status_transition") return t("teacherOffersApiTransition");
  if (error.error === "offer_limit_sanity_cap") return t("teacherOffersApiLimit");
  if (error.error === "slug_conflict") return t("teacherOffersApiConflict");
  if (error.status === 401) return t("teacherOffersLoadError");
  return t("teacherOffersActionError");
}

export function formatPublicTeacherOfferPriceLabel(
  offer: Pick<PublicTeacherOfferDto, "offerType" | "priceCents">,
  t: TeacherOfferTranslator,
  locale: string,
): string {
  const price = formatTeacherOfferPrice(offer.priceCents, locale);
  if (offer.offerType === "package") return t("publicTeacherOffersPricePackage").replace("{price}", price);
  if (offer.offerType === "intro_session") return t("publicTeacherOffersPriceSession").replace("{price}", price);
  if (offer.offerType === "assessment") return t("publicTeacherOffersPriceAssessment").replace("{price}", price);
  return t("publicTeacherOffersPriceHourly").replace("{price}", price);
}

export function formatPublicTeacherOfferPackageChip(
  offer: Pick<PublicTeacherOfferDto, "offerType" | "sessionCount">,
  t: TeacherOfferTranslator,
): string | null {
  if (offer.offerType !== "package" || offer.sessionCount == null || offer.sessionCount < 1) return null;
  return t("publicTeacherOffersPackageOf").replace("{n}", String(offer.sessionCount));
}

export function formatPublicTeacherOfferCapacity(
  offer: Pick<PublicTeacherOfferDto, "capacityMin" | "capacityMax">,
  t: TeacherOfferTranslator,
): string | null {
  const relevant =
    (offer.capacityMax != null && offer.capacityMax > 1) ||
    (offer.capacityMin != null && offer.capacityMin > 1);
  if (!relevant) return null;
  return formatTeacherOfferCapacity(offer, t);
}

export function formatPublicTeacherOfferAge(
  offer: Pick<PublicTeacherOfferDto, "ageMin" | "ageMax">,
  t: TeacherOfferTranslator,
): string | null {
  if (offer.ageMin != null && offer.ageMax != null) {
    return t("publicTeacherOffersAgeRange")
      .replace("{min}", String(offer.ageMin))
      .replace("{max}", String(offer.ageMax));
  }
  if (offer.ageMin != null) return t("publicTeacherOffersAgeFrom").replace("{min}", String(offer.ageMin));
  if (offer.ageMax != null) return t("publicTeacherOffersAgeTo").replace("{max}", String(offer.ageMax));
  return null;
}

export function formatPublicTeacherOfferLevel(
  level: string | null | undefined,
  t: TeacherOfferTranslator,
): string | null {
  const trimmed = level?.trim();
  if (!trimmed) return null;
  return t("publicTeacherOffersLevelChip").replace("{level}", trimmed);
}

export function teacherOfferFormErrorKey(
  error: import("./clientPayload").TeacherOfferFormFieldError,
): TranslationKey {
  if (error === "title") return "teacherOffersErrorTitle";
  if (error === "titleLong") return "teacherOffersErrorTitleLong";
  if (error === "offerType") return "teacherOffersErrorType";
  if (error === "format") return "teacherOffersErrorFormat";
  if (error === "price") return "teacherOffersErrorPrice";
  if (error === "priceInvalid") return "teacherOffersErrorPriceInvalid";
  if (error === "duration") return "teacherOffersErrorDuration";
  if (error === "session") return "teacherOffersErrorSession";
  if (error === "capacity") return "teacherOffersErrorCapacity";
  if (error === "age") return "teacherOffersErrorAge";
  return "teacherOffersErrorDescription";
}
