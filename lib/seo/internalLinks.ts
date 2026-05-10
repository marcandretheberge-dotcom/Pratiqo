import type { Locale } from "@/lib/i18n/types";
import { getBlogPostMeta } from "@/lib/seo/blogPosts";

/** Localized anchor text + path (or teacher signup resolves by locale). */
export type SeoLinkDef =
  | { kind: "path"; href: string; fr: string; en: string; es: string }
  | { kind: "teacherSignup"; fr: string; en: string; es: string };

export type SeoResolvedLink = { href: string; label: string };

const SUPPLY_SLUGS = new Set([
  "emplois-temps-partiel-bien-payes-etudiants-universitaires",
  "donner-cours-prives-side-hustle-etudiants",
  "gagner-argent-musique-piano-guitare-chant",
  "gagner-argent-avec-les-langues",
  "etudiant-enseignement-trouver-premiers-eleves",
  "professeur-retraite-enseigner-quelques-heures",
  "freelance-quebec-cours-prives-bonne-option",
  "creer-profil-professeur-attirer-eleves",
  "combien-charger-cours-prive-quebec",
  "donner-cours-francais-anglais-activite-flexible",
]);

export type BlogIndexClusterId = "all" | "parents" | "teachers" | "music" | "languages" | "pricing";

export function teacherSignupHref(locale: Locale): string {
  return locale === "fr" ? "/devenir-enseignant" : "/become-teacher";
}

export function resolveSeoLink(def: SeoLinkDef, locale: Locale): SeoResolvedLink {
  const href = def.kind === "teacherSignup" ? teacherSignupHref(locale) : def.href;
  const label = locale === "fr" ? def.fr : locale === "es" ? def.es : def.en;
  return { href, label };
}

function P(href: string, fr: string, en: string, es: string): SeoLinkDef {
  return { kind: "path", href, fr, en, es };
}

function T(fr: string, en: string, es: string): SeoLinkDef {
  return { kind: "teacherSignup", fr, en, es };
}

/** Cluster URLs for documentation / reuse (not exhaustive). */
export const SEO_CLUSTER_URLS = {
  studentHub: "/trouver-un-prof",
  pricing: "/tarifs",
  blog: "/blog",
  tuteursMtl: "/tuteurs-prive/montreal",
  tuteursQc: "/tuteurs-prive/quebec",
  coursMathMtl: "/cours/mathematiques/montreal",
  coursPianoMtl: "/cours/piano/montreal",
  coursGuitareMtl: "/cours/guitare/montreal",
  coursEspMtl: "/cours/espagnol/montreal",
  coursAngMtl: "/cours/anglais/montreal",
  coursFrMtl: "/cours/francais/montreal",
  coursFrancisationMtl: "/cours/francisation/montreal",
  francisation: "/francisation",
} as const;

const MTL_MATH = P(
  SEO_CLUSTER_URLS.coursMathMtl,
  "Cours de mathématiques à Montréal",
  "Mathematics lessons in Montreal",
  "Clases de matemática en Montreal",
);
const MTL_PIANO = P(
  SEO_CLUSTER_URLS.coursPianoMtl,
  "Cours de piano à Montréal",
  "Piano lessons in Montreal",
  "Clases de piano en Montreal",
);
const MTL_ESP = P(
  SEO_CLUSTER_URLS.coursEspMtl,
  "Cours d'espagnol à Montréal",
  "Spanish lessons in Montreal",
  "Clases de español en Montreal",
);
const TROUVER = P(
  SEO_CLUSTER_URLS.studentHub,
  "Trouver un professeur près de chez vous",
  "Find a teacher near you",
  "Encontrá un profesor cerca tuyo",
);
const TARIFS = P(
  SEO_CLUSTER_URLS.pricing,
  "Comprendre les tarifs Pratiqo",
  "Understand Pratiqo pricing",
  "Entender las tarifas de Pratiqo",
);
const BLOG_HUB = P(SEO_CLUSTER_URLS.blog, "Tous les guides du blog", "All blog guides", "Todas las guías del blog");
const DEV = T(
  "Créer votre profil d'enseignant sur Pratiqo",
  "Create your teacher profile on Pratiqo",
  "Creá tu perfil de profesor en Pratiqo",
);
const DONNER = P(
  "/blog/donner-cours-prives-quebec",
  "Comment donner des cours privés au Québec",
  "How to give private lessons in Quebec",
  "Cómo dar clases privadas en Québec",
);
const CHOISIR = P(
  "/blog/comment-choisir-tuteur-enfant-quebec",
  "Comment choisir un bon tuteur pour son enfant",
  "How to choose a great tutor for your child",
  "Cómo elegir un buen tutor para tu hijo o hija",
);
const FORMAT = P(
  "/blog/tuteur-en-ligne-ou-a-domicile",
  "Tuteur en ligne ou à domicile : que choisir?",
  "Online tutor or at-home tutor: which should you choose?",
  "Tutor online o a domicilio: ¿qué conviene?",
);
const PRIX_FAMILLE = P(
  "/blog/combien-coute-tuteur-prive-quebec",
  "Combien coûte un tuteur privé au Québec?",
  "How much does a private tutor cost in Quebec?",
  "¿Cuánto cuesta un tutor privado en Québec?",
);
const PREMIER = P(
  "/blog/preparer-premier-cours-prive-enfant",
  "Préparer le premier cours privé de son enfant",
  "Prepare your child’s first private lesson",
  "Preparar la primera clase particular de tu hijo",
);
const MATHS4 = P(
  "/blog/maths-secondaire-4-aide",
  "Mathématiques secondaire 4 : quand demander de l'aide?",
  "Secondary 4 math: when to get help",
  "Matemática secundaria 4: cuándo pedir ayuda",
);
const PIANO_ENFANT = P(
  "/blog/cours-piano-enfants-choisir-professeur",
  "Cours de piano pour enfants : choisir un professeur",
  "Piano lessons for kids: choosing a teacher",
  "Clases de piano para niños: elegir un profesor",
);
const ESP_BLOG = P(
  "/blog/cours-espagnol-pres-chez-vous",
  "Cours d'espagnol : quoi vérifier?",
  "Spanish lessons: what to check",
  "Clases de español: qué mirar antes de elegir",
);
const FRANCISATION_BLOG = P(
  "/blog/francisation-professeur-francais-pres",
  "Francisation : trouver un professeur de français",
  "Francisation: finding a French teacher",
  "Francización: encontrar un profesor de francés",
);
const FRANCISATION_HUB = P(
  SEO_CLUSTER_URLS.francisation,
  "Programme et ressources de francisation",
  "Francisation programs and resources",
  "Programas y recursos de francización",
);
const PROF_RETRAITE = P(
  "/blog/prof-retraite-enseigner-pratiqo",
  "Prof retraité : enseigner quelques heures par semaine",
  "Retired teacher: teaching a few hours a week",
  "Docente jubilado: enseñar algunas horas por semana",
);
const CHARGER = P(
  "/blog/combien-charger-cours-prive-quebec",
  "Combien charger pour un cours privé au Québec?",
  "How much to charge for a private lesson in Quebec",
  "Cuánto cobrar por una clase particular en Québec",
);
const PROFIL = P(
  "/blog/creer-profil-professeur-attirer-eleves",
  "Créer un profil de professeur qui attire des élèves",
  "Create a teacher profile that attracts students",
  "Crear un perfil de profesor que atraiga alumnos",
);
const SIDE = P(
  "/blog/donner-cours-prives-side-hustle-etudiants",
  "Donner des cours privés : un side hustle flexible pour étudiants",
  "Private tutoring: a flexible student side hustle",
  "Dar clases particulares: un side hustle flexible para estudiantes",
);
const EMPLOIS = P(
  "/blog/emplois-temps-partiel-bien-payes-etudiants-universitaires",
  "Meilleurs emplois à temps partiel pour étudiants",
  "Strong part-time jobs for university students",
  "Trabajos part-time para universitarios",
);
const GAGNER_LANG = P(
  "/blog/gagner-argent-avec-les-langues",
  "Comment gagner de l'argent avec les langues",
  "How to make money with languages",
  "Cómo ganar dinero con los idiomas",
);
const GAGNER_MUS = P(
  "/blog/gagner-argent-musique-piano-guitare-chant",
  "Gagner de l'argent avec la musique (piano, guitare, chant)",
  "Making money with music (piano, guitar, singing)",
  "Ganar dinero con música (piano, guitarra, canto)",
);
const FR_EN = P(
  "/blog/donner-cours-francais-anglais-activite-flexible",
  "Cours de français ou d'anglais : activité flexible",
  "Teaching French or English flexibly",
  "Dar clases de francés o inglés con flexibilidad",
);

function resolveAll(defs: SeoLinkDef[], locale: Locale, max = 5): SeoResolvedLink[] {
  return defs.slice(0, max).map((d) => resolveSeoLink(d, locale));
}

/** Contextual “continue reading” links before related articles / CTA. */
export function getBlogContinuationLinks(slug: string, locale: Locale): SeoResolvedLink[] {
  const map: Record<string, SeoLinkDef[]> = {
    "comment-choisir-tuteur-enfant-quebec": [TROUVER, TARIFS, FORMAT, MTL_MATH, PREMIER],
    "combien-coute-tuteur-prive-quebec": [TROUVER, TARIFS, PRIX_FAMILLE, FORMAT, MTL_MATH],
    "tuteur-en-ligne-ou-a-domicile": [TROUVER, TARIFS, CHOISIR, PRIX_FAMILLE, MTL_MATH],
    "preparer-premier-cours-prive-enfant": [TROUVER, TARIFS, CHOISIR, PREMIER, MTL_MATH],
    "maths-secondaire-4-aide": [TROUVER, TARIFS, MATHS4, MTL_MATH, CHOISIR],
    "cours-piano-enfants-choisir-professeur": [TROUVER, TARIFS, PIANO_ENFANT, MTL_PIANO, BLOG_HUB],
    "cours-espagnol-pres-chez-vous": [TROUVER, TARIFS, MTL_ESP, ESP_BLOG, GAGNER_LANG],
    "francisation-professeur-francais-pres": [
      TROUVER,
      FRANCISATION_HUB,
      FRANCISATION_BLOG,
      P("/cours/francisation/montreal", "Cours de francisation à Montréal", "Francisation lessons in Montreal", "Clases de francización en Montreal"),
      MTL_MATH,
    ],
    "donner-cours-prives-quebec": [DEV, TARIFS, CHARGER, PROFIL, SIDE],
    "prof-retraite-enseigner-pratiqo": [DEV, TARIFS, DONNER, PROFIL, CHARGER],
    "professeur-retraite-enseigner-quelques-heures": [DEV, TARIFS, PROF_RETRAITE, DONNER, CHARGER],
    "emplois-temps-partiel-bien-payes-etudiants-universitaires": [DEV, TARIFS, EMPLOIS, SIDE, CHARGER],
    "donner-cours-prives-side-hustle-etudiants": [DEV, TARIFS, DONNER, CHARGER, EMPLOIS],
    "gagner-argent-musique-piano-guitare-chant": [DEV, TARIFS, GAGNER_MUS, MTL_PIANO, PIANO_ENFANT],
    "gagner-argent-avec-les-langues": [DEV, TARIFS, GAGNER_LANG, MTL_ESP, FR_EN],
    "etudiant-enseignement-trouver-premiers-eleves": [DEV, TARIFS, DONNER, PROFIL, SIDE],
    "freelance-quebec-cours-prives-bonne-option": [DEV, TARIFS, DONNER, CHARGER, SIDE],
    "creer-profil-professeur-attirer-eleves": [DEV, TARIFS, PROFIL, CHARGER, SIDE],
    "combien-charger-cours-prive-quebec": [DEV, TARIFS, CHARGER, PROFIL, DONNER],
    "donner-cours-francais-anglais-activite-flexible": [DEV, TARIFS, FR_EN, GAGNER_LANG, MTL_ESP],
  };

  const defs = map[slug];
  if (!defs) return [];
  return resolveAll(defs, locale, 5);
}

/** Blog index audience filters. */
export function getBlogIndexClustersForSlug(slug: string): BlogIndexClusterId[] {
  const out = new Set<BlogIndexClusterId>();
  const meta = getBlogPostMeta(slug);

  if (meta?.audience?.includes("teacher")) {
    out.add("teachers");
  }

  if (SUPPLY_SLUGS.has(slug) || slug === "donner-cours-prives-quebec" || slug === "prof-retraite-enseigner-pratiqo") {
    out.add("teachers");
  }

  if (meta?.audience?.includes("parent") || meta?.audience?.includes("student")) {
    if (!meta.audience.every((a) => a === "teacher")) out.add("parents");
  }

  if (meta?.category === "Musique" || slug.includes("piano") || slug === "gagner-argent-musique-piano-guitare-chant") {
    out.add("music");
  }

  if (
    meta?.category === "Langues" ||
    slug.includes("langues") ||
    slug.includes("espagnol") ||
    slug.includes("francisation") ||
    slug.includes("francais-anglais")
  ) {
    out.add("languages");
  }

  if (
    slug.includes("combien") ||
    slug.includes("coute") ||
    slug.includes("charger") ||
    slug === "tuteur-en-ligne-ou-a-domicile"
  ) {
    out.add("pricing");
  }

  if (slug === "comment-choisir-tuteur-enfant-quebec" || slug === "preparer-premier-cours-prive-enfant") {
    out.add("parents");
  }

  return [...out];
}

export function postMatchesBlogCluster(
  slug: string,
  cluster: BlogIndexClusterId,
): boolean {
  if (cluster === "all") return true;
  const tags = getBlogIndexClustersForSlug(slug);
  if (tags.length === 0) return false;
  return tags.includes(cluster);
}

/** Guides under city landing pages. */
export function getCitySeoGuideLinks(_citySlug: string, locale: Locale): SeoResolvedLink[] {
  return resolveAll([CHOISIR, FORMAT, PRIX_FAMILLE], locale, 3);
}

/** Guides under discipline × city landing pages. */
export function getDisciplineCitySeoGuideLinks(disciplineSlug: string, citySlug: string, locale: Locale): SeoResolvedLink[] {
  const cityPath = `/tuteurs-prive/${citySlug}`;
  const cityLabel =
    citySlug === "montreal"
      ? { fr: "Tuteurs à Montréal", en: "Tutors in Montreal", es: "Tutores en Montreal" }
      : citySlug === "quebec"
        ? { fr: "Tuteurs à Québec", en: "Tutors in Quebec City", es: "Tutores en Quebec" }
        : { fr: `Tuteurs à ${citySlug}`, en: `Tutors in ${citySlug}`, es: `Tutores en ${citySlug}` };

  const tuteursCity = P(cityPath, cityLabel.fr, cityLabel.en, cityLabel.es);
  const coursHere = (disc: string, fr: string, en: string, es: string) =>
    P(`/cours/${disc}/${citySlug}`, fr, en, es);

  if (disciplineSlug === "mathematiques") {
    return resolveAll(
      [
        coursHere(
          "mathematiques",
          `Cours de mathématiques (${citySlug})`,
          `Mathematics lessons (${citySlug})`,
          `Clases de matemática (${citySlug})`,
        ),
        MATHS4,
        tuteursCity,
      ],
      locale,
      3,
    );
  }
  if (disciplineSlug === "piano" || disciplineSlug === "guitare") {
    const inst = disciplineSlug === "piano" ? "piano" : "guitare";
    return resolveAll(
      [
        coursHere(
          inst,
          `Cours de ${inst} (${citySlug})`,
          `${inst === "piano" ? "Piano" : "Guitar"} lessons (${citySlug})`,
          `Clases de ${inst} (${citySlug})`,
        ),
        PIANO_ENFANT,
        GAGNER_MUS,
      ],
      locale,
      3,
    );
  }
  if (disciplineSlug === "espagnol") {
    return resolveAll(
      [
        coursHere("espagnol", `Cours d'espagnol (${citySlug})`, `Spanish lessons (${citySlug})`, `Clases de español (${citySlug})`),
        ESP_BLOG,
        GAGNER_LANG,
      ],
      locale,
      3,
    );
  }
  if (disciplineSlug === "anglais" || disciplineSlug === "francais") {
    const nameFr = disciplineSlug === "anglais" ? "anglais" : "français";
    const nameEn = disciplineSlug === "anglais" ? "English" : "French";
    const nameEs = disciplineSlug === "anglais" ? "inglés" : "francés";
    return resolveAll(
      [
        coursHere(disciplineSlug, `Cours de ${nameFr} (${citySlug})`, `${nameEn} lessons (${citySlug})`, `Clases de ${nameEs} (${citySlug})`),
        FR_EN,
        GAGNER_LANG,
      ],
      locale,
      3,
    );
  }
  if (disciplineSlug === "francisation") {
    return resolveAll(
      [
        FRANCISATION_HUB,
        FRANCISATION_BLOG,
        coursHere("francisation", `Francisation (${citySlug})`, `Francisation (${citySlug})`, `Francización (${citySlug})`),
      ],
      locale,
      3,
    );
  }
  return resolveAll([CHOISIR, tuteursCity, TARIFS], locale, 3);
}
