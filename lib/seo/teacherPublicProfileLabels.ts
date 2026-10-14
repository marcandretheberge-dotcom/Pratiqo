import type { Locale } from "@/lib/i18n/types";
import { getDisciplineLabel } from "@/lib/taxonomy/disciplines";

function normalizeDisciplineKey(discipline: string): string {
  return discipline
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** French « de » / « d' » before discipline (e.g. d'espagnol, de piano). */
export function formatFrenchTeacherDeDiscipline(discipline: string): string {
  const trimmed = discipline.trim();
  if (!trimmed) return "";
  if (/^[aeiouhàâäéèêëïîôùûüy]/i.test(trimmed)) {
    return `d'${trimmed}`;
  }
  return `de ${trimmed}`;
}

const EN_SUBJECT_LABELS: Record<string, string> = {
  espagnol: "Spanish",
  anglais: "English",
  francais: "French",
  mathematiques: "math",
  piano: "piano",
  guitare: "guitar",
  danse: "dance",
  cuisine: "cooking",
  italien: "Italian",
  "arts martiaux": "martial arts",
  photographie: "photography",
};

const ES_SUBJECT_LABELS: Record<string, string> = {
  espagnol: "español",
  anglais: "inglés",
  francais: "francés",
  mathematiques: "matemáticas",
  piano: "piano",
  guitare: "guitarra",
  danse: "danza",
  cuisine: "cocina",
  italien: "italiano",
  "arts martiaux": "artes marciales",
  photographie: "fotografía",
};

/** Locale-specific subject label for teacher SEO copy (title, description, H1, JSON-LD). */
export function localizeTeacherSeoSubject(discipline: string, locale: Locale): string {
  const trimmed = discipline.trim();
  if (!trimmed) return "";
  if (locale === "fr") {
    // The legacy group label names people, not a subject taught by this person.
    return normalizeDisciplineKey(trimmed) === "tuteurs academiques" ? "tutorat académique" : trimmed;
  }

  const key = normalizeDisciplineKey(trimmed);
  if (locale === "en") {
    return EN_SUBJECT_LABELS[key] ?? (getDisciplineLabel(trimmed, locale) || trimmed);
  }
  return ES_SUBJECT_LABELS[key] ?? (getDisciplineLabel(trimmed, locale) || trimmed);
}

export function formatTeacherSeoJobTitle(locale: Locale, discipline: string): string {
  const subject = localizeTeacherSeoSubject(discipline, locale);
  if (!subject) return locale === "fr" ? "Professeur" : locale === "es" ? "Profesor" : "Teacher";

  if (locale === "fr") {
    return `Professeur ${formatFrenchTeacherDeDiscipline(subject)}`;
  }
  if (locale === "es") {
    return `Profesor de ${subject}`;
  }
  return `${subject} teacher`;
}

export function formatTeacherSeoTitle(input: {
  locale: Locale;
  discipline: string;
  firstName: string;
  cityLabel: string;
  online: boolean;
}): string {
  const { locale, firstName, cityLabel, online } = input;
  const subject = localizeTeacherSeoSubject(input.discipline, locale);

  if (locale === "en") {
    if (online) return `${firstName} — online ${subject} teacher | Pratiqo`;
    return `${firstName} — ${subject} teacher in ${cityLabel} | Pratiqo`;
  }
  if (locale === "es") {
    if (online) return `${firstName} — profesor de ${subject} en línea | Pratiqo`;
    return `${firstName} — profesor de ${subject} en ${cityLabel} | Pratiqo`;
  }
  const deDiscipline = formatFrenchTeacherDeDiscipline(subject);
  if (online) return `${firstName} — professeur ${deDiscipline} en ligne | Pratiqo`;
  return `${firstName} — professeur ${deDiscipline} à ${cityLabel} | Pratiqo`;
}

/** Public SEO label for a teacher's teaching format (never exposes exact address). */
export function formatTeacherSeoTeachingFormatLabel(
  locale: Locale,
  teachingMode: string | null | undefined,
): string | null {
  const mode = typeof teachingMode === "string" ? teachingMode.trim().toLowerCase() : "";
  if (!mode) return null;

  if (mode === "all") {
    if (locale === "fr") {
      return "En ligne, chez le professeur et chez l'élève";
    }
    if (locale === "es") {
      return "En línea, en el lugar del profesor y en el lugar del estudiante";
    }
    return "Online, at the teacher's place and at the student's place";
  }

  if (mode === "online") {
    if (locale === "fr") return "En ligne";
    if (locale === "es") return "En línea";
    return "Online";
  }

  if (mode === "person" || mode === "in_person" || mode === "in-person") {
    return locale === "fr" ? "En personne" : locale === "es" ? "Presencial" : "In person";
  }
  if (mode === "home") {
    return locale === "fr" ? "À domicile" : locale === "es" ? "A domicilio" : "At home";
  }
  if (mode === "both") {
    if (locale === "fr") return "En ligne et en personne";
    if (locale === "es") return "En línea y en persona";
    return "Online and in person";
  }

  return null;
}

export function formatTeacherSeoDescription(input: {
  locale: Locale;
  discipline: string;
  firstName: string;
  cityLabel: string;
  online: boolean;
}): string {
  const { locale, firstName, cityLabel, online } = input;
  const subject = localizeTeacherSeoSubject(input.discipline, locale);

  if (locale === "en") {
    if (online) {
      return `View ${firstName}'s ${subject} teacher profile online on Pratiqo. Explore their approach, lesson formats and displayed rate.`;
    }
    return `View ${firstName}'s ${subject} teacher profile in ${cityLabel} on Pratiqo. Explore their approach, lesson formats and displayed rate.`;
  }
  if (locale === "es") {
    if (online) {
      return `Perfil de ${firstName}, profesor de ${subject} en línea en Pratiqo. Consulta su enfoque, los formatos y la tarifa publicada.`;
    }
    return `Perfil de ${firstName}, profesor de ${subject} en ${cityLabel} en Pratiqo. Consulta su enfoque, los formatos y la tarifa publicada.`;
  }
  const deDiscipline = formatFrenchTeacherDeDiscipline(subject);
  if (online) {
    return `Profil de ${firstName}, professeur ${deDiscipline} en ligne. Consultez son approche, ses formats de cours et son tarif sur Pratiqo.`;
  }
  return `Profil de ${firstName}, professeur ${deDiscipline} à ${cityLabel}. Consultez son approche, ses formats de cours et son tarif sur Pratiqo.`;
}

export function formatTeacherSeoH1(input: {
  locale: Locale;
  discipline: string;
  firstName: string;
  cityLabel: string;
  online: boolean;
}): string {
  const { locale, firstName, cityLabel, online } = input;
  const subject = localizeTeacherSeoSubject(input.discipline, locale);

  if (locale === "en") {
    if (online) return `${firstName} — online ${subject} teacher`;
    return `${firstName} — ${subject} teacher in ${cityLabel}`;
  }
  if (locale === "es") {
    if (online) return `${firstName} — profesor de ${subject} en línea`;
    return `${firstName} — profesor de ${subject} en ${cityLabel}`;
  }
  const deDiscipline = formatFrenchTeacherDeDiscipline(subject);
  if (online) return `${firstName} — professeur ${deDiscipline} en ligne`;
  return `${firstName} — professeur ${deDiscipline} à ${cityLabel}`;
}
