import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/types";
import { SITE_URL } from "@/lib/seo/site";

export type SubjectLandingKey = "coach_trainer" | "cooking" | "martial_arts" | "dance";

export interface SubjectLandingContent {
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  learnTitle: string;
  learnItems: string[];
  whyTitle: string;
  whyItems: string[];
  searchCta: string;
  teacherCta: string;
  emptyState: string;
  teacherRecruitment: string;
}

export interface SubjectLandingPage {
  key: SubjectLandingKey;
  slug: string;
  searchQuery: string;
  content: Record<Locale, SubjectLandingContent>;
}

export const SUBJECT_LANDING_PAGES: SubjectLandingPage[] = [
  {
    key: "coach_trainer",
    slug: "coach-entraineur",
    searchQuery: "coach",
    content: {
      fr: {
        label: "Entraîneur / coach",
        title: "Coach et entraîneur privé au Québec | Pratiqo",
        description:
          "Trouvez un coach ou entraîneur privé pour progresser à votre rythme. Comparez les profils disponibles sur Pratiqo.",
        h1: "Trouver un coach ou entraîneur privé",
        intro:
          "Cherchez un accompagnement individuel pour bouger, vous entraîner ou reprendre une routine avec plus de clarté. Pratiqo vous aide à comparer les profils réels, en ligne ou près de chez vous.",
        learnTitle: "Ce que vous pouvez travailler",
        learnItems: [
          "mise en forme, entraînement privé ou habitudes de pratique",
          "objectifs personnels, rythme progressif et suivi adapté",
          "préparation physique générale, cardio ou renforcement",
        ],
        whyTitle: "Une recherche utile, sans fausse promesse",
        whyItems: [
          "les résultats dépendent du profil choisi, de votre objectif et de votre régularité",
          "Pratiqo affiche les profils disponibles sans inventer d'offres locales",
          "vous pouvez aussi proposer vos services si vous enseignez ou coachez déjà",
        ],
        searchCta: "Chercher un coach sur Pratiqo",
        teacherCta: "Devenir professeur ou coach",
        emptyState:
          "Si aucun profil ne correspond encore à votre recherche, élargissez le lieu, choisissez le format en ligne ou revenez plus tard.",
        teacherRecruitment:
          "Vous enseignez l'entraînement privé, la mise en forme ou le coaching? Créez votre profil pour rejoindre la marketplace Pratiqo.",
      },
      en: {
        label: "Coach / trainer",
        title: "Private coaches and trainers in Quebec | Pratiqo",
        description:
          "Find a private coach or trainer and learn at your own pace. Compare available profiles on Pratiqo.",
        h1: "Find a private coach or trainer",
        intro:
          "Look for one-on-one support for training, movement, or rebuilding a routine with more clarity. Pratiqo helps you compare real profiles online or near you.",
        learnTitle: "What you can work on",
        learnItems: [
          "fitness, private training, or healthier practice habits",
          "personal goals, progressive pacing, and adapted support",
          "general conditioning, cardio, or strength training",
        ],
        whyTitle: "Useful search, no fake promises",
        whyItems: [
          "results depend on the profile you choose, your goal, and your consistency",
          "Pratiqo shows available profiles without inventing local offers",
          "you can also offer your services if you already teach or coach",
        ],
        searchCta: "Search coaches on Pratiqo",
        teacherCta: "Become a teacher or coach",
        emptyState:
          "If no profile matches your search yet, broaden the location, choose online lessons, or check again later.",
        teacherRecruitment:
          "Do you teach private training, fitness, or coaching? Create your profile to join the Pratiqo marketplace.",
      },
      es: {
        label: "Entrenador / coach",
        title: "Entrenadores y coaches privados en Quebec | Pratiqo",
        description:
          "Encuentra un coach o entrenador privado para progresar a tu ritmo. Compara perfiles disponibles en Pratiqo.",
        h1: "Encuentra un coach o entrenador privado",
        intro:
          "Busca acompañamiento individual para entrenar, moverte o retomar una rutina con más claridad. Pratiqo te ayuda a comparar perfiles reales, en línea o cerca de ti.",
        learnTitle: "Qué puedes trabajar",
        learnItems: [
          "fitness, entrenamiento privado o hábitos de práctica",
          "objetivos personales, ritmo progresivo y apoyo adaptado",
          "acondicionamiento general, cardio o fortalecimiento",
        ],
        whyTitle: "Una búsqueda útil, sin falsas promesas",
        whyItems: [
          "los resultados dependen del perfil elegido, de tu objetivo y de tu constancia",
          "Pratiqo muestra perfiles disponibles sin inventar ofertas locales",
          "también puedes ofrecer tus servicios si ya enseñas o entrenas",
        ],
        searchCta: "Buscar entrenadores en Pratiqo",
        teacherCta: "Convertirme en profesor o coach",
        emptyState:
          "Si todavía no hay un perfil que coincida con tu búsqueda, amplía la ubicación, elige el formato en línea o vuelve más tarde.",
        teacherRecruitment:
          "¿Enseñas entrenamiento privado, fitness o coaching? Crea tu perfil para unirte a la marketplace Pratiqo.",
      },
    },
  },
  {
    key: "cooking",
    slug: "cuisine",
    searchQuery: "cuisine",
    content: {
      fr: {
        label: "Cuisine",
        title: "Cours de cuisine privés au Québec | Pratiqo",
        description:
          "Trouvez des cours de cuisine privés avec des professeurs et passionnés près de chez vous ou en ligne.",
        h1: "Trouver un cours de cuisine",
        intro:
          "Apprenez une technique, préparez un plat avec plus d'assurance ou découvrez une cuisine qui vous inspire. La recherche Pratiqo vous mène vers des profils réels, pas vers des annonces inventées.",
        learnTitle: "Idées de cours utiles",
        learnItems: [
          "bases de cuisine maison, organisation et préparation",
          "pâtisserie, boulangerie, cuisine du monde ou repas de semaine",
          "cours en ligne, à domicile ou selon le format proposé par le professeur",
        ],
        whyTitle: "Avant de réserver",
        whyItems: [
          "comparez le profil, l'expérience et le format du cours",
          "vérifiez les disponibilités réelles dans la recherche",
          "aucune fiche professeur fictive n'est créée pour remplir la page",
        ],
        searchCta: "Chercher un cours de cuisine",
        teacherCta: "Enseigner la cuisine sur Pratiqo",
        emptyState:
          "S'il n'y a pas encore de cours de cuisine près de vous, essayez le format en ligne ou revenez quand de nouveaux profils seront publiés.",
        teacherRecruitment:
          "Vous donnez des cours de cuisine, de pâtisserie ou de boulangerie? Pratiqo peut vous aider à recevoir des demandes structurées.",
      },
      en: {
        label: "Cooking",
        title: "Private cooking classes in Quebec | Pratiqo",
        description:
          "Find private cooking classes with teachers and passionate cooks near you or online.",
        h1: "Find a cooking class",
        intro:
          "Learn a technique, prepare a dish with more confidence, or explore a cuisine that inspires you. Pratiqo search points to real profiles, not invented listings.",
        learnTitle: "Useful class ideas",
        learnItems: [
          "home cooking basics, organization, and preparation",
          "baking, pastry, world cuisines, or weeknight meals",
          "online, at-home, or in-person lessons depending on the teacher",
        ],
        whyTitle: "Before you book",
        whyItems: [
          "compare the profile, experience, and class format",
          "check real availability in search",
          "no fake teacher card is created to fill this page",
        ],
        searchCta: "Search cooking classes",
        teacherCta: "Teach cooking on Pratiqo",
        emptyState:
          "If there are no cooking classes near you yet, try online lessons or check back when new profiles are published.",
        teacherRecruitment:
          "Do you teach cooking, pastry, or baking? Pratiqo can help you receive structured lesson requests.",
      },
      es: {
        label: "Cocina",
        title: "Clases privadas de cocina en Quebec | Pratiqo",
        description:
          "Encuentra clases privadas de cocina con profesores y personas apasionadas cerca de ti o en línea.",
        h1: "Encuentra una clase de cocina",
        intro:
          "Aprende una técnica, prepara un plato con más confianza o descubre una cocina que te inspire. La búsqueda de Pratiqo apunta a perfiles reales, no a anuncios inventados.",
        learnTitle: "Ideas de clases útiles",
        learnItems: [
          "bases de cocina casera, organización y preparación",
          "repostería, panadería, cocinas del mundo o comidas de la semana",
          "clases en línea, a domicilio o según el formato propuesto por el profesor",
        ],
        whyTitle: "Antes de reservar",
        whyItems: [
          "compara el perfil, la experiencia y el formato de la clase",
          "verifica la disponibilidad real en la búsqueda",
          "no se crea ninguna ficha falsa de profesor para llenar esta página",
        ],
        searchCta: "Buscar clases de cocina",
        teacherCta: "Enseñar cocina en Pratiqo",
        emptyState:
          "Si todavía no hay clases de cocina cerca de ti, prueba el formato en línea o vuelve cuando se publiquen nuevos perfiles.",
        teacherRecruitment:
          "¿Das clases de cocina, repostería o panadería? Pratiqo puede ayudarte a recibir solicitudes estructuradas.",
      },
    },
  },
  {
    key: "martial_arts",
    slug: "arts-martiaux",
    searchQuery: "arts martiaux",
    content: {
      fr: {
        label: "Arts martiaux",
        title: "Cours d'arts martiaux au Québec | Pratiqo",
        description:
          "Explorez des cours d'arts martiaux comme le karaté, le judo, le taekwondo ou la boxe avec des enseignants disponibles sur Pratiqo.",
        h1: "Trouver un cours d'arts martiaux",
        intro:
          "Karaté, judo, taekwondo, boxe, autodéfense ou discipline proche: commencez par comparer les profils disponibles et le type d'accompagnement proposé.",
        learnTitle: "Ce que la recherche peut couvrir",
        learnItems: [
          "initiation, technique de base ou entraînement récréatif",
          "discipline, coordination, mobilité et confiance",
          "cours individuels, en ligne ou en présence selon le professeur",
        ],
        whyTitle: "Sécurité et réalisme",
        whyItems: [
          "choisissez un professeur selon son expérience et son approche",
          "vérifiez les conditions du cours avant de réserver",
          "Pratiqo ne promet pas qu'un style précis soit disponible dans chaque ville",
        ],
        searchCta: "Chercher des cours d'arts martiaux",
        teacherCta: "Enseigner les arts martiaux",
        emptyState:
          "Si votre discipline n'apparaît pas encore, essayez un terme proche comme boxe, karaté, judo ou autodéfense.",
        teacherRecruitment:
          "Vous enseignez les arts martiaux ou l'autodéfense? Créez votre profil pour aider les élèves à vous trouver.",
      },
      en: {
        label: "Martial arts",
        title: "Martial arts classes in Quebec | Pratiqo",
        description:
          "Explore martial arts classes such as karate, judo, taekwondo, boxing, and more with teachers on Pratiqo.",
        h1: "Find a martial arts class",
        intro:
          "Karate, judo, taekwondo, boxing, self-defense, or a related discipline: start by comparing available profiles and the kind of support they offer.",
        learnTitle: "What search can cover",
        learnItems: [
          "introductory practice, basic technique, or recreational training",
          "discipline, coordination, mobility, and confidence",
          "private, online, or in-person lessons depending on the teacher",
        ],
        whyTitle: "Safety and realism",
        whyItems: [
          "choose a teacher based on experience and approach",
          "check the lesson conditions before booking",
          "Pratiqo does not promise that every style is available in every city",
        ],
        searchCta: "Search martial arts classes",
        teacherCta: "Teach martial arts",
        emptyState:
          "If your discipline does not appear yet, try a related term such as boxing, karate, judo, or self-defense.",
        teacherRecruitment:
          "Do you teach martial arts or self-defense? Create your profile so learners can find you.",
      },
      es: {
        label: "Artes marciales",
        title: "Clases de artes marciales en Quebec | Pratiqo",
        description:
          "Explora clases de artes marciales como karate, judo, taekwondo, boxeo y más con profesores en Pratiqo.",
        h1: "Encuentra una clase de artes marciales",
        intro:
          "Karate, judo, taekwondo, boxeo, defensa personal o una disciplina cercana: empieza comparando perfiles disponibles y el tipo de acompañamiento que ofrecen.",
        learnTitle: "Qué puede cubrir la búsqueda",
        learnItems: [
          "iniciación, técnica básica o entrenamiento recreativo",
          "disciplina, coordinación, movilidad y confianza",
          "clases privadas, en línea o presenciales según el profesor",
        ],
        whyTitle: "Seguridad y realismo",
        whyItems: [
          "elige un profesor según su experiencia y su enfoque",
          "verifica las condiciones de la clase antes de reservar",
          "Pratiqo no promete que cada estilo esté disponible en cada ciudad",
        ],
        searchCta: "Buscar clases de artes marciales",
        teacherCta: "Enseñar artes marciales",
        emptyState:
          "Si tu disciplina todavía no aparece, prueba un término cercano como boxeo, karate, judo o defensa personal.",
        teacherRecruitment:
          "¿Enseñas artes marciales o defensa personal? Crea tu perfil para que los alumnos puedan encontrarte.",
      },
    },
  },
  {
    key: "dance",
    slug: "danse",
    searchQuery: "danse",
    content: {
      fr: {
        label: "Danse",
        title: "Cours de danse privés au Québec | Pratiqo",
        description:
          "Trouvez des cours de danse privés ou en ligne : salsa, ballet, hip-hop, bachata et plus encore.",
        h1: "Trouver un cours de danse",
        intro:
          "Que vous cherchiez une première initiation, une pratique sociale ou un style précis, Pratiqo vous aide à passer de l'envie au bon profil de professeur.",
        learnTitle: "Styles et objectifs possibles",
        learnItems: [
          "salsa, bachata, ballet, hip-hop ou danse contemporaine",
          "rythme, coordination, confiance et pratique guidée",
          "préparation d'un événement, loisir ou progression personnelle",
        ],
        whyTitle: "Une page pour orienter la recherche",
        whyItems: [
          "la disponibilité dépend des vrais professeurs publiés",
          "les cours peuvent être privés, en ligne ou en présence selon le profil",
          "la recherche reste ouverte si aucun professeur ne correspond immédiatement",
        ],
        searchCta: "Chercher un cours de danse",
        teacherCta: "Enseigner la danse sur Pratiqo",
        emptyState:
          "Si aucun cours ne s'affiche encore, essayez un style précis comme salsa, ballet, hip-hop ou bachata.",
        teacherRecruitment:
          "Vous enseignez la danse? Publiez votre profil pour être trouvé par des élèves qui cherchent un cours privé.",
      },
      en: {
        label: "Dance",
        title: "Private dance classes in Quebec | Pratiqo",
        description:
          "Find private or online dance classes: salsa, ballet, hip-hop, bachata, and more.",
        h1: "Find a dance class",
        intro:
          "Whether you want a first introduction, social practice, or a specific style, Pratiqo helps you move from interest to the right teacher profile.",
        learnTitle: "Possible styles and goals",
        learnItems: [
          "salsa, bachata, ballet, hip-hop, or contemporary dance",
          "rhythm, coordination, confidence, and guided practice",
          "event preparation, recreation, or personal progress",
        ],
        whyTitle: "A page to guide search",
        whyItems: [
          "availability depends on real published teacher profiles",
          "lessons may be private, online, or in person depending on the profile",
          "search remains open if no teacher matches immediately",
        ],
        searchCta: "Search dance classes",
        teacherCta: "Teach dance on Pratiqo",
        emptyState:
          "If no class appears yet, try a specific style such as salsa, ballet, hip-hop, or bachata.",
        teacherRecruitment:
          "Do you teach dance? Publish your profile so learners looking for private classes can find you.",
      },
      es: {
        label: "Danza / baile",
        title: "Clases privadas de danza y baile en Quebec | Pratiqo",
        description:
          "Encuentra clases privadas o en línea de danza y baile: salsa, ballet, hip-hop, bachata y más.",
        h1: "Encuentra una clase de danza o baile",
        intro:
          "Ya sea que busques una primera introducción, práctica social o un estilo específico, Pratiqo te ayuda a pasar del interés al perfil de profesor adecuado.",
        learnTitle: "Estilos y objetivos posibles",
        learnItems: [
          "salsa, bachata, ballet, hip-hop o danza contemporánea",
          "ritmo, coordinación, confianza y práctica guiada",
          "preparación para un evento, ocio o progreso personal",
        ],
        whyTitle: "Una página para orientar la búsqueda",
        whyItems: [
          "la disponibilidad depende de perfiles reales publicados",
          "las clases pueden ser privadas, en línea o presenciales según el perfil",
          "la búsqueda sigue abierta si ningún profesor coincide de inmediato",
        ],
        searchCta: "Buscar clases de danza",
        teacherCta: "Enseñar danza en Pratiqo",
        emptyState:
          "Si todavía no aparece ninguna clase, prueba un estilo específico como salsa, ballet, hip-hop o bachata.",
        teacherRecruitment:
          "¿Enseñas danza o baile? Publica tu perfil para que te encuentren alumnos que buscan clases privadas.",
      },
    },
  },
];

export const SUBJECT_LANDING_PATHS = SUBJECT_LANDING_PAGES.map((page) => `/cours/${page.slug}` as const);

export function getSubjectLandingPageBySlug(slug: string): SubjectLandingPage | undefined {
  return SUBJECT_LANDING_PAGES.find((page) => page.slug === slug);
}

export function buildSubjectSearchHref(page: SubjectLandingPage): string {
  return `/trouver-un-prof?q=${encodeURIComponent(page.searchQuery)}`;
}

export function buildSubjectLandingMetadata(page: SubjectLandingPage, locale: Locale): Metadata {
  const content = page.content[locale];
  const canonical = `${SITE_URL}/cours/${page.slug}`;

  return {
    title: content.title,
    description: content.description,
    openGraph: {
      title: content.title,
      description: content.description,
      url: canonical,
      siteName: "Pratiqo",
      locale: locale === "fr" ? "fr_CA" : locale === "es" ? "es_UY" : "en_CA",
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
      description: content.description,
      images: ["/og-image.png"],
    },
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
