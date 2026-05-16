import { tFormat } from "@/lib/i18n/format";
import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";

/** Display label for SEO link grids (slug keys from {@link lib/seo/seo-data}). */
const SEO_SUBJECT_LABEL_EN: Record<string, string> = {
  piano: "piano",
  guitare: "guitar",
  musique: "music",
  mathematiques: "mathematics",
  francais: "French",
  anglais: "English",
  espagnol: "Spanish",
  francisation: "francization",
  sciences: "science",
  "aide-aux-devoirs": "homework help",
  programmation: "programming",
};

const SEO_SUBJECT_LABEL_ES: Record<string, string> = {
  piano: "piano",
  guitare: "guitarra",
  musique: "música",
  mathematiques: "matemáticas",
  francais: "francés",
  anglais: "inglés",
  espagnol: "español",
  francisation: "francización",
  sciences: "ciencias",
  "aide-aux-devoirs": "ayuda con tareas",
  programmation: "programación",
};

export function seoSubjectLinkLabel(
  locale: Locale,
  subjectSlug: string,
  frenchLabel: string,
): string {
  if (locale === "en") return SEO_SUBJECT_LABEL_EN[subjectSlug] ?? frenchLabel;
  if (locale === "es") return SEO_SUBJECT_LABEL_ES[subjectSlug] ?? frenchLabel;
  return frenchLabel;
}

export function seoCourseFrequentSearchParams(
  locale: Locale,
  subjectSlug: string,
  frenchSubjectLabel: string,
  frenchTeacherNoun: string,
  cityName: string,
): { subject: string; city: string; teacherNoun: string } {
  const subject = seoSubjectLinkLabel(locale, subjectSlug, frenchSubjectLabel);
  if (locale === "fr") {
    return { subject, city: cityName, teacherNoun: frenchTeacherNoun };
  }
  if (locale === "en") {
    return { subject, city: cityName, teacherNoun: `${subject} teacher` };
  }
  return { subject, city: cityName, teacherNoun: `profesor de ${subject}` };
}

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
