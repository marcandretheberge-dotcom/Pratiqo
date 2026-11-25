import type { YoLocale } from "../types";
import type { LocaleText } from "../italian/italianModuleTypes";

export type NewFoundationLanguage = "en" | "es" | "fr-CA";
export type TextCourseLanguage = "it" | "de" | "pt-BR" | NewFoundationLanguage;

export const foundationSettings: Record<NewFoundationLanguage, {
  name: string; slug: string; progressKey: string; finalId: string; draftPrefix: string;
  title: LocaleText; description: LocaleText;
}> = {
  en: {
    name: "English", slug: "anglais", progressKey: "yopratiqo:english-foundations:v1", finalId: "enf-final", draftPrefix: "english-foundations",
    title: { fr: "L’anglais, une conversation à la fois.", en: "English, one conversation at a time.", es: "Inglés, una conversación a la vez." },
    description: { fr: "Rencontrer, se déplacer, raconter et s’organiser. Construis tes phrases dans des scènes du quotidien au Canada.", en: "Meet people, get around, tell a story and make plans. Build your own sentences in everyday Canadian situations.", es: "Conocer gente, desplazarte, contar y organizarte. Construye tus frases en situaciones cotidianas de Canadá." },
  },
  es: {
    name: "Español", slug: "espagnol", progressKey: "yopratiqo:spanish-foundations:v1", finalId: "esf-final", draftPrefix: "spanish-foundations",
    title: { fr: "L’espagnol pour entrer en conversation.", en: "Spanish for real conversations.", es: "Español para entrar en conversación." },
    description: { fr: "Des premières rencontres aux projets de voyage : pratique un espagnol d’Amérique latine, avec des repères sur les usages régionaux.", en: "From first meetings to travel plans: practise Latin American Spanish, with guidance on regional usage.", es: "De los primeros encuentros a los planes de viaje: practica español de América Latina, con pautas sobre usos regionales." },
  },
  "fr-CA": {
    name: "Français du Québec", slug: "francais-quebec", progressKey: "yopratiqo:french-quebec-foundations:v1", finalId: "frqf-final", draftPrefix: "french-quebec-foundations",
    title: { fr: "Le français pour prendre sa place au Québec.", en: "French for everyday life in Québec.", es: "Francés para la vida cotidiana en Quebec." },
    description: { fr: "Une rencontre, un rendez-vous, un échange au travail. Apprends à comprendre, répondre et demander une précision dans la vie quotidienne.", en: "A meeting, an appointment, a conversation at work. Learn to understand, respond and ask for clarification in everyday life.", es: "Un encuentro, una cita, una conversación en el trabajo. Aprende a comprender, responder y pedir aclaraciones en la vida diaria." },
  },
};

export function isNewFoundationLanguage(language: string): language is NewFoundationLanguage {
  return language === "en" || language === "es" || language === "fr-CA";
}
export function foundationHref(language: NewFoundationLanguage, locale: YoLocale | string, unit = "") {
  const safeLocale = locale === "en" || locale === "es" ? locale : "fr";
  return `/yo/langues/${foundationSettings[language].slug}/parcours${unit ? `/${encodeURIComponent(unit)}` : ""}?lang=${safeLocale}`;
}

export const courseKeyboard: Record<TextCourseLanguage, readonly string[]> = {
  it: ["à", "è", "é", "ì", "ò", "ù", "’"],
  de: ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"],
  "pt-BR": ["á", "â", "ã", "à", "é", "ê", "í", "ó", "ô", "õ", "ú", "ç"],
  en: ["’"], es: ["á", "é", "í", "ó", "ú", "ü", "ñ", "¿", "¡"],
  "fr-CA": ["à", "â", "ç", "é", "è", "ê", "ë", "î", "ï", "ô", "ù", "û", "ü", "œ", "’"],
};

/** Hypothetical game amounts, never checkout prices. */
export const courseMoney: Record<TextCourseLanguage, { locale: string; currency: string }> = {
  it: { locale: "it-IT", currency: "EUR" }, de: { locale: "de-DE", currency: "EUR" },
  "pt-BR": { locale: "pt-BR", currency: "BRL" }, en: { locale: "en-CA", currency: "CAD" },
  "fr-CA": { locale: "fr-CA", currency: "CAD" }, es: { locale: "es-MX", currency: "MXN" },
};
