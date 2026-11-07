import { lstr } from "./localize";
import type { YoLocale, YoLocalizedString } from "./types";
import type { YoLanguageBadgeId } from "@/components/yo/YoLanguageBadge";
import { findYoPratiqoModuleBySlug, isYoLandingPageIndexable, yopratiqoProductConfig } from "./yopratiqoProductConfig";

export type YoPublicLanguage = {
  slug: string;
  badge: YoLanguageBadgeId;
  name: YoLocalizedString;
  detail: YoLocalizedString;
  description: YoLocalizedString;
  path: string;
  landingRoute: string;
  inLanguage: string;
  presentationLocales: readonly YoLocale[];
};

// Public discovery only. The legacy product config still owns intro/premium
// access gates; this catalog must never grant access or alter progression.
export const yoPublicCatalog: readonly YoPublicLanguage[] = [
  {
    slug: "anglais", badge: "en", name: lstr("Anglais", "English", "Inglés"),
    detail: lstr("Oser parler · introduction", "Start speaking · introduction", "Atreverse a hablar · introducción"),
    description: lstr("Une introduction gratuite à l’anglais : phrases utiles, faux amis, contexte canadien et pratique orale.", "A free English introduction: useful phrases, false friends, Canadian context and speaking practice."),
    path: "/yo/langues/anglais/demarrer", landingRoute: "/yo/langues/anglais", inLanguage: "en-CA", presentationLocales: ["fr", "en"],
  },
  {
    slug: "francais-quebec", badge: "fr-ca", name: lstr("Français québécois / Francisation", "Quebec French / Francization", "Francés quebequense / Francización"),
    detail: lstr("La vie au Québec · introduction", "Life in Quebec · introduction", "La vida en Quebec · introducción"),
    description: lstr("Une introduction gratuite au français québécois : mots du quotidien, culture locale et repères de francisation.", "A free Quebec French introduction: everyday words, local culture and francization landmarks."),
    path: "/yo/langues/francais-quebec/demarrer", landingRoute: "/yo/langues/francais-quebec", inLanguage: "fr-CA", presentationLocales: ["fr", "en"],
  },
  {
    slug: "espagnol", badge: "es", name: lstr("Espagnol", "Spanish", "Español"),
    detail: lstr("Premières conversations · introduction", "First conversations · introduction", "Primeras conversaciones · introducción"),
    description: lstr("Une introduction gratuite à l’espagnol : premiers mots, culture, phrases de voyage et écoute.", "A free Spanish introduction: first words, culture, travel phrases and listening.", "Una introducción gratuita al español: primeras palabras, cultura, frases de viaje y escucha."),
    path: "/yo/langues/espagnol/demarrer", landingRoute: "/yo/langues/espagnol", inLanguage: "es", presentationLocales: ["fr", "en", "es"],
  },
  {
    slug: "japonais", badge: "ja", name: lstr("Japonais", "Japanese", "Japonés"),
    detail: lstr("Premiers pas au Japon · 8 modules", "First steps in Japan · 8 modules", "Primeros pasos en Japón · 8 módulos"),
    description: lstr("Huit modules avec Yoppo : dialogues guidés, kana, kanji en contexte, culture, écriture et révisions.", "Eight modules with Yoppo: guided dialogues, kana, kanji in context, culture, writing and review.", "Ocho módulos con Yoppo: diálogos guiados, kana, kanji en contexto, cultura, escritura y repaso."),
    path: "/yo/langues/japonais/demarrer", landingRoute: "/yo/langues/japonais", inLanguage: "ja", presentationLocales: ["fr", "en", "es"],
  },
  {
    slug: "italien", badge: "it", name: lstr("Italien", "Italian", "Italiano"),
    detail: lstr("La vie en italien · 12 unités", "Life in Italian · 12 units", "La vida en italiano · 12 unidades"),
    description: lstr("Douze unités avec Yoppo : dialogues, écoute, jeux de pratique, lectures, projets et quiz culturel en images.", "Twelve units with Yoppo: dialogues, listening, practice games, readings, projects and a picture-based culture quiz.", "Doce unidades con Yoppo: diálogos, escucha, juegos de práctica, lecturas, proyectos y un quiz cultural con imágenes."),
    path: "/yo/langues/italien/parcours", landingRoute: "/yo/langues/italien", inLanguage: "it", presentationLocales: ["fr", "en"],
  },
  {
    slug: "allemand", badge: "de", name: lstr("Allemand", "German", "Alemán"),
    detail: lstr("Premiers pas avec Yoppo · 8 étapes", "First steps with Yoppo · 8 stops", "Primeros pasos con Yoppo · 8 etapas"),
    description: lstr("Pratique l’allemand avec Yoppo : huit étapes de dialogues, écoute, jeux, lectures, photos et un quiz culturel final.", "Practise German with Yoppo: eight stops with dialogues, listening, games, readings, photos and a final culture quiz.", "Practica alemán con Yoppo: ocho etapas de diálogos, escucha, juegos, lecturas, fotos y un quiz cultural final."),
    path: "/yo/langues/allemand/demarrer", landingRoute: "/yo/langues/allemand", inLanguage: "de", presentationLocales: ["fr", "en", "es"],
  },
  {
    slug: "portugais-bresil", badge: "pt-br", name: lstr("Portugais du Brésil", "Brazilian Portuguese", "Portugués de Brasil"),
    detail: lstr("Premières rencontres au Brésil · 8 étapes", "First encounters in Brazil · 8 stops", "Primeros encuentros en Brasil · 8 etapas"),
    description: lstr("Pratique le portugais du Brésil avec Yoppo : huit étapes de dialogues, écoute, jeux, photos et un quiz culturel final.", "Practise Brazilian Portuguese with Yoppo: eight stops with dialogues, listening, games, photos and a final culture quiz.", "Practica portugués de Brasil con Yoppo: ocho etapas con diálogos, escucha, juegos, fotos y un quiz cultural final."),
    path: "/yo/langues/portugais-bresil/demarrer", landingRoute: "/yo/langues/portugais-bresil", inLanguage: "pt-BR", presentationLocales: ["fr", "en", "es"],
  },
  {
    slug: "mandarin", badge: "zh", name: lstr("Mandarin", "Mandarin", "Mandarín"),
    detail: lstr("Premières conversations · 8 modules et une mission finale", "First conversations · 8 modules and a final mission", "Primeras conversaciones · 8 módulos y una misión final"),
    description: lstr("Découvre le mandarin avec Yoppo : tons, pinyin, caractères simplifiés, dialogues, écoute et culture en huit modules et une mission finale.", "Explore Mandarin with Yoppo: tones, pinyin, simplified characters, dialogues, listening and culture in eight modules and a final mission.", "Descubre el mandarín con Yoppo: tonos, pinyin, caracteres simplificados, diálogos, escucha y cultura en ocho módulos y una misión final."),
    path: "/yo/langues/mandarin/demarrer", landingRoute: "/yo/langues/mandarin", inLanguage: "zh-Hans", presentationLocales: ["fr", "en", "es"],
  },
];

export function isYoPublicLanguageIndexable(slug: string): boolean {
  const entry = yoPublicCatalog.find((course) => course.slug === slug);
  if (!entry) return false;
  return findYoPratiqoModuleBySlug(slug)
    ? isYoLandingPageIndexable(slug)
    : yopratiqoProductConfig.landingPagesEnabled && yopratiqoProductConfig.landingPageIndexingEnabled;
}

export function getYoPublicLanguages(): readonly YoPublicLanguage[] {
  return yoPublicCatalog.filter((course) => {
    const legacy = findYoPratiqoModuleBySlug(course.slug);
    return !legacy || legacy.isAccessibleForFree;
  });
}
