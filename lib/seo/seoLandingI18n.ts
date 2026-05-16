import { tFormat } from "@/lib/i18n/format";
import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";

export function seoTeachingModeLabel(locale: Locale, mode: string): string {
  if (mode === "online") return t(locale, "online");
  if (mode === "person") return t(locale, "inPerson");
  return t(locale, "teachingFormatHybrid");
}

export function seoCourseTeacherCountLabel(locale: Locale, count: number): string {
  if (count === 0) return t(locale, "seoLandingTeacherCountNone");
  if (count === 1) return t(locale, "seoLandingTeacherCountOne");
  return tFormat(locale, "seoLandingTeacherCountMany", { count });
}

export function seoTutorCountLabel(locale: Locale, count: number): string {
  if (count === 0) return t(locale, "seoLandingTutorCountNone");
  if (count === 1) return t(locale, "seoLandingTutorCountOne");
  return tFormat(locale, "seoLandingTutorCountMany", { count });
}

export function seoCourseLinkLabel(
  locale: Locale,
  subjectLabel: string,
  cityName: string,
): string {
  return tFormat(locale, "seoLandingLinkCourseInCity", {
    subject: subjectLabel,
    city: cityName,
  });
}

export function seoPrivateTutorsLinkLabel(locale: Locale, cityName: string): string {
  return tFormat(locale, "seoLandingLinkPrivateTutorsInCity", { city: cityName });
}
