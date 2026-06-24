import type { Locale } from "@/lib/i18n/types";

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
  if (locale === "fr") return trimmed;

  const key = normalizeDisciplineKey(trimmed);
  if (locale === "en") {
    return EN_SUBJECT_LABELS[key] ?? trimmed;
  }
  return ES_SUBJECT_LABELS[key] ?? trimmed;
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
      return `View ${firstName}'s ${subject} teacher profile on Pratiqo. Online lessons, flexible scheduling, and secure booking when available.`;
    }
    return `View ${firstName}'s ${subject} teacher profile in ${cityLabel} on Pratiqo. Online or in-person lessons, flexible scheduling, and secure booking when available.`;
  }
  if (locale === "es") {
    if (online) {
      return `Perfil de ${firstName}, profesor de ${subject} en línea en Pratiqo. Clases en línea, horarios flexibles y reserva segura cuando esté disponible.`;
    }
    return `Perfil de ${firstName}, profesor de ${subject} en ${cityLabel} en Pratiqo. Clases en línea o presenciales, horarios flexibles y reserva segura cuando esté disponible.`;
  }
  const deDiscipline = formatFrenchTeacherDeDiscipline(subject);
  if (online) {
    return `Profil de ${firstName}, professeur ${deDiscipline} en ligne sur Pratiqo. Cours en ligne, horaires flexibles et réservation sécurisée selon disponibilité.`;
  }
  return `Profil de ${firstName}, professeur ${deDiscipline} à ${cityLabel} sur Pratiqo. Cours en ligne ou en personne, horaires flexibles et réservation sécurisée selon disponibilité.`;
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
