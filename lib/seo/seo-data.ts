/**
 * Centralized SEO copy + helpers for Québec marketplace landing pages.
 * City rows come from {@link QC_CITIES}; discipline slugs align with {@link DISCIPLINES}.
 */

import { findCityBySlug, QC_CITIES, type QcCity } from "@/lib/constants/cities";
import { haversineDistance } from "@/lib/geo";
import { findDisciplineBySlug } from "@/lib/seo/disciplines";
import { ROUTING_DEFAULT_LOCALE, withLocale } from "@/lib/i18n/routing";
import { SITE_URL } from "@/lib/seo/site";
import { SEO_COURSE_CITY_SLUGS, type SeoCourseCitySlug } from "@/lib/seo/seo-course-city-slugs";
import { isPriorityCourseCityCombo } from "./localSeoContent";

export {
  buildCourseCityFaqs,
  buildTutorCityFaqs,
  isPriorityCourseCityCombo,
} from "./localSeoContent";

export type SeoSubjectCategory = "musique" | "langue" | "tutorat";

export type SeoSubjectMeta = {
  slug: string;
  label: string;
  category: SeoSubjectCategory;
  searchLabel: string;
  teacherNoun: string;
  studentIntent: string;
  parentIntent: string;
  seoIntro: string;
  faqAngle: string;
};

const SUBJECT_META: Record<string, SeoSubjectMeta> = {
  piano: {
    slug: "piano",
    label: "piano",
    category: "musique",
    searchLabel: "prof de piano",
    teacherNoun: "prof de piano",
    studentIntent:
      "Tu veux progresser au piano pour jouer tes pièces préférées ou te préparer à un examen, avec une méthode claire et un suivi régulier.",
    parentIntent:
      "Tu cherches un prof de piano fiable pour ton enfant, avec une communication simple sur les attentes et la progression.",
    seoIntro:
      "Le piano demande une bonne posture, une écoute du son et une routine de pratique réaliste. Un professeur particulier aide à éviter les mauvaises habitudes dès le début.",
    faqAngle: "instrument, pratique à la maison et choix du professeur",
  },
  guitare: {
    slug: "guitare",
    label: "guitare",
    category: "musique",
    searchLabel: "cours de guitare",
    teacherNoun: "prof de guitare",
    studentIntent:
      "Tu veux apprendre la guitare pour accompagner des chansons, composer ou jouer en groupe, sans te sentir bloqué par la technique.",
    parentIntent:
      "Tu veux un cours motivant pour un ado ou un adulte débutant, avec des objectifs concrets semaine après semaine.",
    seoIntro:
      "La guitare se prête bien aux cours en ligne ou en personne : le professeur peut corriger la posture et la main au fur et à mesure.",
    faqAngle: "choix acoustique/électrique, premiers accords et motivation",
  },
  musique: {
    slug: "musique",
    label: "musique",
    category: "musique",
    searchLabel: "cours de musique",
    teacherNoun: "professeur de musique",
    studentIntent:
      "Tu explores plusieurs instruments ou la théorie, et tu veux une direction claire pour ne pas disperser ton énergie.",
    parentIntent:
      "Tu veux une porte d’entrée vers le bon professeur selon l’instrument et l’âge de ton enfant.",
    seoIntro:
      "La musique au Québec se vit autant en école qu’en loisir : un professeur adapté rend la progression plus stable et plus agréable.",
    faqAngle: "orientation instrument, niveaux et formats de cours",
  },
  mathematiques: {
    slug: "mathematiques",
    label: "mathématiques",
    category: "tutorat",
    searchLabel: "tuteur en mathématiques",
    teacherNoun: "tuteur en mathématiques",
    studentIntent:
      "Tu veux comprendre les notions qui bloquent (fonctions, trigonométrie, probabilités) et gagner en confiance avant les examens.",
    parentIntent:
      "Tu veux du soutien scolaire sérieux, avec une explication patiente et des stratégies de résolution adaptées au programme québécois.",
    seoIntro:
      "Les maths se « débloquent » souvent quand la méthode est répétée avec des exemples concrets : un tuteur aide à structurer le travail à la maison.",
    faqAngle: "niveaux secondaire/collégial, fréquence des séances et préparation aux examens",
  },
  francais: {
    slug: "francais",
    label: "français",
    category: "langue",
    searchLabel: "professeur de français",
    teacherNoun: "professeur de français",
    studentIntent:
      "Tu veux améliorer ta grammaire, ta conversation ou ta rédaction, avec un suivi adapté à ton niveau.",
    parentIntent:
      "Tu veux renforcer le français scolaire tout en respectant le rythme de ton enfant.",
    seoIntro:
      "Au Québec, le français se vit aussi à l’oral : un professeur peut travailler la compréhension, l’expression et les consignes scolaires.",
    faqAngle: "conversation, rédaction et objectifs personnels",
  },
  anglais: {
    slug: "anglais",
    label: "anglais",
    category: "langue",
    searchLabel: "cours d’anglais",
    teacherNoun: "professeur d’anglais",
    studentIntent:
      "Tu veux parler plus couramment, te préparer à un test ou améliorer ton anglais professionnel.",
    parentIntent:
      "Tu veux des cours structurés pour un jeune qui a besoin de pratique régulière et de feedback clair.",
    seoIntro:
      "L’anglais utile au Québec mélange compréhension, accent et vocabulaire : un professeur aide à pratiquer sans tabou.",
    faqAngle: "conversation, examens et anglais de travail",
  },
  espagnol: {
    slug: "espagnol",
    label: "espagnol",
    category: "langue",
    searchLabel: "cours d’espagnol",
    teacherNoun: "professeur d’espagnol",
    studentIntent:
      "Tu veux voyager, communiquer avec ta famille ou progresser rapidement en conversation.",
    parentIntent:
      "Tu veux une approche progressive pour un enfant ou un ado, avec des activités parlées.",
    seoIntro:
      "L’espagnol se pratique beaucoup à l’oral : un professeur aide à corriger la prononciation et à bâtir des phrases utiles au quotidien.",
    faqAngle: "niveaux, immersion légère et régularité",
  },
  francisation: {
    slug: "francisation",
    label: "francisation",
    category: "langue",
    searchLabel: "cours de francisation",
    teacherNoun: "professeur de francisation",
    studentIntent:
      "Tu veux gagner en autonomie au quotidien au Québec : démarches, conversations et compréhension locale.",
    parentIntent:
      "Tu veux un accompagnement respectueux du rythme d’apprentissage d’un nouveau arrivant dans la famille.",
    seoIntro:
      "La francisation sur Pratiqo complète souvent d’autres ressources : le cours particulier cible tes situations réelles (travail, école, logement).",
    faqAngle: "vie quotidienne, démarches et français québécois",
  },
  sciences: {
    slug: "sciences",
    label: "sciences",
    category: "tutorat",
    searchLabel: "tuteur en sciences",
    teacherNoun: "tuteur en sciences",
    studentIntent:
      "Tu veux mieux comprendre physique, chimie ou biologie avec des explications reliées à ton programme.",
    parentIntent:
      "Tu veux éviter que ton ado accumule des incompréhensions avant les évaluations ministérielles.",
    seoIntro:
      "Les sciences demandent à la fois intuition et méthode : un tuteur aide à relier les concepts et à structurer les problèmes.",
    faqAngle: "niveaux, laboratoire vs théorie, préparation aux examens",
  },
  "aide-aux-devoirs": {
    slug: "aide-aux-devoirs",
    label: "aide aux devoirs",
    category: "tutorat",
    searchLabel: "aide aux devoirs",
    teacherNoun: "tuteur pour l’aide aux devoirs",
    studentIntent:
      "Tu veux une routine moins stressante après l’école, avec une méthode pour démarrer et finir les devoirs.",
    parentIntent:
      "Tu veux réduire les conflits à la maison tout en gardant une exigence réaliste sur la qualité du travail.",
    seoIntro:
      "L’aide aux devoirs efficace ne fait pas le travail à la place de l’élève : elle clarifie les consignes et rend l’étude plus autonome.",
    faqAngle: "organisation, motivation et collaboration avec l’école",
  },
  programmation: {
    slug: "programmation",
    label: "programmation",
    category: "tutorat",
    searchLabel: "cours de programmation",
    teacherNoun: "tuteur en programmation",
    studentIntent:
      "Tu veux comprendre la logique, débugger et avancer sur des projets concrets (web, Python, etc.).",
    parentIntent:
      "Tu veux un encadrement pour un jeune intéressé par la tech, avec des objectifs sécuritaires et progressifs.",
    seoIntro:
      "La programmation s'apprend en faisant : un tuteur guide à travers des petits projets pour solidifier les bases.",
    faqAngle: "outils, environnement de travail et niveau de départ",
  },
};

/** Villes « hub » : contenus plus longs (tuteurs + cours). */
export const SEO_PRIORITY_TUTOR_CITY_SLUGS = new Set<string>([
  "montreal",
  "quebec",
  "laval",
  "longueuil",
  "sherbrooke",
  "gatineau",
  "trois-rivieres",
  "levis",
  "saint-georges",
  "drummondville",
]);

const CITY_LOCAL_CONTEXT: Partial<Record<string, string>> = {
  montreal:
    "Grand bassin d’étudiants et de familles : forte demande en musique, langues et tutorat, avec beaucoup de cours en ligne ou en personnel sur l’île.",
  quebec:
    "Capitale régionale : recherche stable de tuteurs pour le secondaire et le cégep, et une scène musicale active.",
  laval:
    "Ville dense côté familles : besoin fréquent d’aide aux devoirs et de cours de musique près de la maison.",
  longueuil:
    "Rive-Sud très connectée à Montréal : les élèves mélangent souvent cours en ligne et rencontres en personne.",
  sherbrooke:
    "Ville universitaire : demande marquée pour les maths, les sciences et les langues au collégial.",
  "trois-rivieres":
    "Centre du Québec : bon marché pour le tutorat scolaire et les cours de musique pour jeunes et adultes.",
  gatineau:
    "Proximité d’Ottawa : intérêt pour français, anglais et musique, avec formats en ligne populaires.",
  drummondville:
    "Milieu régional dynamique : familles cherchent souvent de la constance dans le suivi scolaire.",
  levis:
    "Rive sud de la capitale : beaucoup de déplacements courts pour des cours en personne ou hybrides.",
  "saint-georges":
    "Beauce : demande locale forte pour le tutorat et les cours de musique accessibles.",
  brossard:
    "Rive sud urbaine : familles actives, horaires chargés, forte adoption des cours en ligne.",
  terrebonne:
    "Laurentides proches de Montréal : recherche de profs pour musique et devoirs après l’école.",
  blainville:
    "Familles : besoin récurrent d’encadrement scolaire et d’activités musicales pour enfants.",
  repentigny:
    "Lanaudière : marché local où la proximité et la confiance comptent autant que le prix.",
  granby:
    "Haute-Yamaska : demande pour cours de musique et soutien scolaire régulier.",
  "saint-hyacinthe":
    "Agglomération étudiante : intérêt pour sciences, maths et langues.",
  saguenay:
    "Saguenay–Lac-Saint-Jean : besoin de tutorat sérieux et de cours de musique pour tous âges.",
  rimouski:
    "Bas-Saint-Laurent : communauté étudiante et familles qui valorisent le suivi personnalisé.",
  "rouyn-noranda":
    "Abitibi-Témiscamingue : formats en ligne utiles pour élargir le choix de professeurs.",
  "val-dor":
    "Nord québécois : la combinaison cours en ligne + séances ciblées fonctionne bien pour plusieurs matières.",
};

export type SeoCity = QcCity & { province: "Québec"; localContext: string };

export function getCityBySlug(slug: string): SeoCity | undefined {
  const city = findCityBySlug(slug);
  if (!city || city.countryCode !== "CA") return undefined;
  const localContext =
    CITY_LOCAL_CONTEXT[slug] ??
    `Marché local à ${city.name} (${city.region}) : familles et étudiants cherchent souvent des cours privés fiables et des profils vérifiés.`;
  return { ...city, province: "Québec", localContext };
}

export function getSubjectBySlug(slug: string): SeoSubjectMeta | undefined {
  if (SUBJECT_META[slug]) return SUBJECT_META[slug];
  const d = findDisciplineBySlug(slug);
  if (!d) return undefined;
  return {
    slug: d.slug,
    label: d.name.toLowerCase(),
    category: d.dbCategory === "Musique" ? "musique" : d.dbCategory === "Langues" ? "langue" : "tutorat",
    searchLabel: `cours de ${d.name.toLowerCase()}`,
    teacherNoun: `professeur de ${d.name.toLowerCase()}`,
    studentIntent: `Tu veux progresser en ${d.name.toLowerCase()} avec un accompagnement clair et des objectifs réalistes.`,
    parentIntent: `Tu veux un encadrement sérieux pour ton enfant, avec communication simple sur la progression.`,
    seoIntro: `Les cours de ${d.name.toLowerCase()} réussissent mieux quand le professeur adapte la pédagogie à ton rythme et à ton contexte.`,
    faqAngle: "tarifs, format de cours et vérification des profils",
  };
}

export function getNearbyCities(citySlug: string, limit = 5): SeoCity[] {
  const origin = findCityBySlug(citySlug);
  if (!origin || origin.countryCode !== "CA") return [];
  const others = QC_CITIES.filter((c) => c.slug !== citySlug && c.countryCode === "CA")
    .map((c) => ({ c, d: haversineDistance(origin.lat, origin.lng, c.lat, c.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => getCityBySlug(x.c.slug))
    .filter((c): c is SeoCity => Boolean(c));
  return others;
}

export function getRelatedSubjects(subjectSlug: string, limit = 5): SeoSubjectMeta[] {
  const self = getSubjectBySlug(subjectSlug);
  if (!self) return [];
  const pool = Object.values(SUBJECT_META).filter((s) => s.slug !== subjectSlug && s.category === self.category);
  const cross = Object.values(SUBJECT_META).filter((s) => s.slug !== subjectSlug && s.category !== self.category);
  const merged = [...pool, ...cross];
  return merged.slice(0, limit);
}

export function getCoursePagePath(subjectSlug: string, citySlug: string): string {
  return `/cours/${subjectSlug}/${citySlug}`;
}

export function getTutorCityPagePath(citySlug: string): string {
  return `/tuteurs-prive/${citySlug}`;
}

export function buildCanonicalUrl(pathWithoutLocale: string): string {
  const path = pathWithoutLocale.startsWith("/") ? pathWithoutLocale : `/${pathWithoutLocale}`;
  return `${SITE_URL}${withLocale(path, ROUTING_DEFAULT_LOCALE)}`;
}

export function isSeoCourseCitySlug(slug: string): slug is SeoCourseCitySlug {
  return (SEO_COURSE_CITY_SLUGS as readonly string[]).includes(slug);
}

export function isPriorityTutorCity(slug: string): boolean {
  return SEO_PRIORITY_TUTOR_CITY_SLUGS.has(slug);
}

export function isPriorityCoursePage(citySlug: string, disciplineSlug: string): boolean {
  return isPriorityCourseCityCombo(citySlug, disciplineSlug);
}
