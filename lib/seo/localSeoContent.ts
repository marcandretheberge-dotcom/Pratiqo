/**
 * Rich, subject-aware and city-aware SEO copy for Québec marketplace pages.
 * Québec French; content varies by page to limit thin duplicates.
 */

import type { Locale } from "@/lib/i18n/types";
import { ROUTING_DEFAULT_LOCALE, withLocale } from "@/lib/i18n/routing";
import { SITE_URL } from "@/lib/seo/site";

/** Shape-compatible with {@link SeoCity} from `seo-data` (avoid circular imports). */
export type LocalSeoCity = {
  name: string;
  slug: string;
  region: string;
  province: string;
  localContext: string;
};

/** Shape-compatible with {@link SeoSubjectMeta} from `seo-data`. */
export type LocalSeoSubject = {
  label: string;
  teacherNoun: string;
  searchLabel: string;
  studentIntent: string;
  parentIntent: string;
  seoIntro: string;
  faqAngle: string;
};

// ── Priority matrices (Phase 5 / 6) ───────────────────────────────────────────

/** Exact course×city combinations that get long-form body (≈500–800 words FR). */
const PRIORITY_COURSE_CITY_KEYS = new Set<string>([
  "piano:montreal",
  "piano:quebec",
  "guitare:montreal",
  "guitare:quebec",
  "mathematiques:montreal",
  "mathematiques:quebec",
  "mathematiques:laval",
  "francais:montreal",
  "anglais:montreal",
  "espagnol:montreal",
  "francisation:montreal",
  "aide-aux-devoirs:sherbrooke",
  "programmation:montreal",
]);

export function isPriorityCourseCityCombo(citySlug: string, disciplineSlug: string): boolean {
  return PRIORITY_COURSE_CITY_KEYS.has(`${disciplineSlug}:${citySlug}`);
}

/** Tutor hubs with long-form copy (≈500–800 words FR). */
const TUTOR_CITY_LONG_FORM = new Set<string>([
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

export function isTutorCityLongForm(citySlug: string): boolean {
  return TUTOR_CITY_LONG_FORM.has(citySlug);
}

// ── Priority city hub (nearby + score) — complements geo distance elsewhere ─────

export type PriorityCityHub = {
  slug: string;
  label: string;
  region: string;
  localContext: string;
  /** Manual nearby slugs for internal linking when geodesic order differs from business sense */
  nearbySlugs: string[];
  priorityScore: number;
};

export const PRIORITY_CITY_HUBS: Record<string, PriorityCityHub> = {
  montreal: {
    slug: "montreal",
    label: "Montréal",
    region: "Île-de-Montréal",
    localContext:
      "Grand réseau de quartiers denses, familles et étudiants : beaucoup de besoins en musique, langues, tutorat et aide aux devoirs après l’école, souvent combinés à des cours en ligne l’hiver.",
    nearbySlugs: ["laval", "longueuil", "brossard", "quebec"],
    priorityScore: 10,
  },
  quebec: {
    slug: "quebec",
    label: "Québec",
    region: "Capitale-Nationale",
    localContext:
      "Capitale régionale : familles, études collégiales et universitaires, et recherche stable de tuteurs pour le français, les maths et la musique.",
    nearbySlugs: ["levis", "saint-georges", "montreal"],
    priorityScore: 9,
  },
  laval: {
    slug: "laval",
    label: "Laval",
    region: "Laval",
    localContext:
      "Ville de couronnes suburbaines : parents actifs, déplacements courts après l’école et forte demande pour l’aide aux devoirs et les cours de musique près de la maison.",
    nearbySlugs: ["montreal", "terrebonne", "longueuil", "blainville"],
    priorityScore: 8,
  },
  longueuil: {
    slug: "longueuil",
    label: "Longueuil",
    region: "Montérégie",
    localContext:
      "Rive sud très liée à Montréal : les familles mélangent souvent cours en ligne et rencontres en personnel pour gagner du temps.",
    nearbySlugs: ["brossard", "montreal", "saint-jean-sur-richelieu", "chambly"],
    priorityScore: 8,
  },
  sherbrooke: {
    slug: "sherbrooke",
    label: "Sherbrooke",
    region: "Estrie",
    localContext:
      "Milieu universitaire : demande marquée pour les mathématiques, les sciences, les langues et l’aide aux devoirs au secondaire et au collégial.",
    nearbySlugs: ["magog", "granby", "victoriaville"],
    priorityScore: 7,
  },
  gatineau: {
    slug: "gatineau",
    label: "Gatineau",
    region: "Outaouais",
    localContext:
      "Proximité d’Ottawa : besoins en français, en anglais et en musique, avec beaucoup de formats en ligne pour concilier horaires et familles.",
    nearbySlugs: ["montreal", "trois-rivieres"],
    priorityScore: 7,
  },
  "trois-rivieres": {
    slug: "trois-rivieres",
    label: "Trois-Rivières",
    region: "Mauricie",
    localContext:
      "Centre du Québec : familles et étudiants cherchent du tutorat régulier et des cours de musique accessibles, souvent avec suivi hybride.",
    nearbySlugs: ["drummondville", "shawinigan", "quebec"],
    priorityScore: 7,
  },
  levis: {
    slug: "levis",
    label: "Lévis",
    region: "Chaudière-Appalaches",
    localContext:
      "Rive sud de la capitale : trajets courts pour les cours en personne face à Québec, et bonne adoption des cours en ligne les semaines chargées.",
    nearbySlugs: ["quebec", "saint-georges"],
    priorityScore: 6,
  },
  "saint-georges": {
    slug: "saint-georges",
    label: "Saint-Georges",
    region: "Chaudière-Appalaches",
    localContext:
      "Beauce : marché local où la confiance et la proximité comptent; les familles apprécient un service clair sans promesse de « milliers de profs ».",
    nearbySlugs: ["quebec", "levis", "sherbrooke"],
    priorityScore: 6,
  },
  drummondville: {
    slug: "drummondville",
    label: "Drummondville",
    region: "Centre-du-Québec",
    localContext:
      "Ville régionale dynamique : demande pour le soutien scolaire régulier, la musique et les langues, avec hivers qui poussent vers plus de cours en ligne.",
    nearbySlugs: ["victoriaville", "sherbrooke", "trois-rivieres"],
    priorityScore: 6,
  },
};

// ── Subject depth (10 priority slugs) ───────────────────────────────────────────

type SubjectDepth = {
  searchIntent: string;
  whoFor: string;
  whatTheyWant: string;
  benefits: string;
  howToCompare: string;
  longExtras: string[];
};

const SUBJECT_DEPTH: Partial<Record<string, SubjectDepth>> = {
  piano: {
    searchIntent:
      "On cherche souvent un prof de piano à domicile ou en studio pour un enfant débutant, un ado qui lit la musique, ou un adulte qui reprend après des années.",
    whoFor:
      "Ça peut être une première expérience à 6–8 ans, un secondaire qui prépare une audition, ou un adulte qui veut jouer avec plaisir sans se blesser à la technique.",
    whatTheyWant:
      "Les gens veulent une méthode pour la posture, les doigts et la lecture; une progression réaliste; et des habitudes de pratique à la maison qui tiennent la route.",
    benefits:
      "Un bon prof de piano aide à éviter les tensions, structure la séance (échauffement, répertoire, lecture) et rend la pratique moins intimidante.",
    howToCompare:
      "Regarde l’expérience avec ton tranche d’âge, le type d’instrument (acoustique vs numérique), le format (en ligne ou en personne à Montréal ou ailleurs) et la clarté des disponibilités.",
    longExtras: [
      "À la maison, un piano droit ou un bon clavier 88 touches amplifie la motivation. Même avec un instrument modeste, la régularité bat la quantité : 15 minutes bien cadrées valent mieux qu’une heure découragée.",
      "Les cours en personne à Montréal ou en banlieue peuvent aider pour la posture et les mains; en ligne reste excellent si le son et l’angle caméra sont corrects.",
    ],
  },
  guitare: {
    searchIntent:
      "Beaucoup tapent « cours de guitare » pour apprendre des accords, jouer des chansons et progresser sans rester bloqué sur YouTube.",
    whoFor:
      "Ados, adultes débutants et parfois des plus jeunes avec une guitare adaptée; certains visent l’électrique et le rock, d’autres l’acoustique autour du feu.",
    whatTheyWant:
      "Des premiers accords qui sonnent vite, une routine de pratique courte, et des explications simples sur le rythme et la coordination main gauche / main droite.",
    benefits:
      "Un prof de guitare structure la progression (accords → transitions → morceaux), corrige la posture et évite que les doigts « se battent » contre l’instrument.",
    howToCompare:
      "Vérifie si la personne enseigne acoustique, classique ou électrique, comment elle introduit le solfège (léger ou plus poussé), et si elle cible les styles que tu aimes.",
    longExtras: [
      "La pratique consistante compte plus que le matériel au début : une guitare bien réglée et des objectifs hebdomadaires retenus avec le prof suffisent souvent pour sentir la différence en quelques semaines.",
      "À Québec comme ailleurs, combiner rencontres locales et séances en ligne permet de tenir le rythme quand les horaires familiaux changent.",
    ],
  },
  musique: {
    searchIntent:
      "Les recherches « cours de musique » viennent souvent d’une famille qui ne sait pas encore quel instrument choisir, ou d’un élève qui veut théorie + pratique.",
    whoFor:
      "Parents d’enfants, adolescents multipassions et adultes qui veulent une orientation avant d’investir dans un instrument.",
    whatTheyWant:
      "Une feuille de route claire : essai, objectifs réalistes et suivis sans se disperser entre cinq instruments en même temps.",
    benefits:
      "Clarifier le niveau et le style évite d’abandonner trop tôt : le professeur de musique aide à poser des bases solides (oreille, rythme, lecture).",
    howToCompare:
      "Demande comment la première rencontre fonctionne, quels instruments peuvent être proposés en démo, et comment le suivi s’adapte au programme scolaire ou non.",
    longExtras: [
      "Au Québec, beaucoup d’élèves jonglent école, sport et loisirs : un plan léger mais régulier fonctionne mieux qu’un cours massif une fois aux deux semaines.",
    ],
  },
  mathematiques: {
    searchIntent:
      "Les familles cherchent un tuteur en mathématiques pour le primaire, le secondaire ou le cégep, souvent avant un examen ou après une baisse de notes.",
    whoFor:
      "Élèves qui bloquent sur une notion (fractions, fonctions, trigonométrie), parents inquiets pour l’organisation des devoirs, ou adultes qui reprennent des bases.",
    whatTheyWant:
      "Des explications étape par étape, plus de confiance avant les évaluations, et parfois une méthode pour démarrer les problèmes sans paniquer.",
    benefits:
      "Un tuteur en mathématiques relie les exemples au programme québécois, structure le travail à la maison et réduit la honte autour des « je ne comprends pas ».",
    howToCompare:
      "Regarde l’expérience de niveau (secondaire 4–5, calcul différentiel, etc.), la façon d’expliquer sans faire le travail à ta place, et la fréquence proposée.",
    longExtras: [
      "À Montréal, Laval ou ailleurs, mélanger en ligne et présentiel peut aider quand les transports ou le sport mangent les soirées.",
      "Les parents gagnent quand le tuteur coordonne avec les objectifs scolaires sans remplacer l’autonomie de l’élève devoir après devoir.",
    ],
  },
  francais: {
    searchIntent:
      "On cherche un professeur de français pour la compréhension, l’écriture, la grammaire ou la communication orale, au primaire au cégep ou pour l’adulte.",
    whoFor:
      "Élèves avec des consignes longues, adultes en réinsertion, ou néo-Québécois qui veulent solidifier l’écrit.",
    whatTheyWant:
      "Feedback clair sur les textes, stratégies de lecture, et pratique orale sans jugement.",
    benefits:
      "Un suivi régulier améliore la rédaction, la structure des paragraphes et la confiance à l’oral — surtout pour les présentations.",
    howToCompare:
      "Vérifie si la personne connaît les niveaux du ministère, comment elle corrige les devoirs, et si elle propose de la conversation structurée.",
    longExtras: [
      "À Montréal comme partout au Québec, le français se vit aussi à l’oral : un bon prof sait mêler grammaire utile et situations réelles (courriels, exposés, entrevues).",
    ],
  },
  anglais: {
    searchIntent:
      "Les requêtes vont de la conversation à l’anglais de travail, à la préparation scolaire ou aux tests, avec besoin de prononciation compréhensible.",
    whoFor:
      "Étudiants, professionnels et familles qui veulent une pratique régulière avec feedback honnête.",
    whatTheyWant:
      "Moins de blocage à l’oral, vocabulaire utile et routines simples (5–10 minutes par jour entre les cours).",
    benefits:
      "Un professeur d’anglais cadre des mises en situation, corrige les erreurs récurrentes et évite que tu restes sur du « classroom English » figé.",
    howToCompare:
      "Regarde l’accent cible (américain, canadien, etc.), les supports utilisés, et si le niveau affiché correspond au tien.",
    longExtras: [
      "À Laval et sur l’ensemble du Québec, le cours en ligne est très courant pour l’anglais : bon micro, écouteurs, et objectifs concrets par semaine.",
    ],
  },
  espagnol: {
    searchIntent:
      "Voyages, famille, ou simple plaisir : on veut parler plus tôt que parfait, avec de vraies phrases utiles.",
    whoFor:
      "Ados, adultes et parfois des familles bilingues qui veulent solidifier une base.",
    whatTheyWant:
      "Prononciation, temps verbaux essentiels et fluidité sans théâtre académique interminable.",
    benefits:
      "Un professeur d’espagnol recentre sur l’oral, le vocabulaire thématique et la compréhension rapide des locuteurs.",
    howToCompare:
      "Demande quels dialectes ou pays il privilégie, comment il intègre l’écoute (podcasts, extraits), et la dose d’écriture voulue.",
    longExtras: [
      "Montréal attire des profils variés : choisis quelqu’un qui te met en situation de parole dès les premières séances.",
    ],
  },
  francisation: {
    searchIntent:
      "Nouveaux arrivants et résidents veulent gagner en autonomie au travail, à l’école et dans la vie de tous les jours au Québec.",
    whoFor:
      "Adultes en emploi, parents d’enfants scolarisés, ou personnes qui complètent d’autres démarches d’intégration.",
    whatTheyWant:
      "Conversation de base, compréhension des consignes, et confiance pour téléphoner, lire un courriel ou parler au personnel d’école.",
    benefits:
      "La francisation ciblée sur tes situations réelles (services, quartier, travail) complète souvent d’autres ressources sans les remplacer.",
    howToCompare:
      "Vérifie le respect du rythme, l’expérience avec les niveaux débutants, et la capacité à alterner oral et mini-tâches concrètes.",
    longExtras: [
      "À Montréal, la vie urbaine offre des occasions de pratique : un prof peut t’aider à préparer ce que tu veux dire avant d’y aller.",
      "La francisation efficace mise sur la régularité et la bienveillance : petites victoires chaque semaine valent mieux qu’un cours unique marathon.",
    ],
  },
  "aide-aux-devoirs": {
    searchIntent:
      "Les parents cherchent de l’aide aux devoirs quand les soirées deviennent des batailles, ou quand l’élève accumule des retards sur plusieurs matières.",
    whoFor:
      "Primaire au secondaire surtout; parfois un élève qui procrastine ou qui n’arrive pas à démarrer seul.",
    whatTheyWant:
      "Moins de conflits à la maison, une méthode pour lire les consignes, et un suivi qui respecte le rôle de l’école.",
    benefits:
      "Le tuteur structure le temps, clarifie ce qui est demandé et rend l’élève plus autonome — sans faire les devoirs à sa place.",
    howToCompare:
      "Demande comment la personne collabore avec les parents, comment elle priorise les matières, et comment elle mesure la progression.",
    longExtras: [
      "À Sherbrooke comme ailleurs, de courtes séances fréquentes aident souvent plus qu’une longue soirée une fois par mois.",
      "L’objectif est durable : quand l’élève sait par où comminer, il retrouve du contrôle face aux évaluations.",
    ],
  },
  programmation: {
    searchIntent:
      "Apprendre à coder pour un cours, un cégep, ou un projet perso : Python, web, algorithmes de base.",
    whoFor:
      "Secondaire, collégial, adultes en reconversion et curieux de tech.",
    whatTheyWant:
      "Comprendre la logique, débugger sans paniquer, et livrer de petits projets concrets.",
    benefits:
      "Un tuteur en programmation te fait pratiquer dans un environnement propre, avec revue de code et bonnes habitudes (Git, structure, tests simples).",
    howToCompare:
      "Regarde les langages enseignés, le niveau (débutant vs données/applications web), et la façon de progresser par micro-projets.",
    longExtras: [
      "À Montréal, l’écosystème tech est dense : un bon accompagnement relie souvent théorie et portfolio.",
      "La sécurité et la sobriété comptent : évite de partager des identifiants; concentre-toi sur l’apprentissage dans un cadre clair avec ton prof.",
    ],
  },
};

function getDepth(slug: string): SubjectDepth | undefined {
  return SUBJECT_DEPTH[slug];
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** FR intro + body; EN/ES get a shorter body for localized URLs without duplicating full translation work. */
export function buildCourseCitySeoContent(input: {
  locale: Locale;
  subject: LocalSeoSubject;
  city: LocalSeoCity;
  disciplineSlug: string;
  disciplineName: string;
}): { intro: string; bodyParagraphs: string[] } {
  const { locale, subject, city, disciplineSlug, disciplineName } = input;
  const long = isPriorityCourseCityCombo(city.slug, disciplineSlug);
  const depth = getDepth(disciplineSlug);
  const hub = PRIORITY_CITY_HUBS[city.slug];

  const labelLc = subject.label;
  const tn = subject.teacherNoun;

  if (locale !== "fr") {
    const intro =
      locale === "en"
        ? `Find ${subject.searchLabel} teachers near ${city.name}, QC. Compare real profiles and book on Pratiqo — identity-verified instructors, clear rates.`
        : `Encuentra clases de ${labelLc} en ${city.name}, QC. Perfiles reales y reserva en Pratiqo.`;
    const body: string[] = [
      locale === "en"
        ? `Whether you're looking for ${labelLc} lessons or a ${tn}, start with your goal (age, level, online vs in-person). Pratiqo shows real teachers — we never invent availability or headcounts.`
        : `Define tu objetivo (nivel, formato) y compara perfiles reales en Pratiqo.`,
      locale === "en"
        ? `For ${city.name} and nearby areas, many students mix winter-friendly online sessions with in-person meetings when it makes sense. Check each profile for teaching mode and pricing.`
        : `Combina online y presencial según tu semana.`,
    ];
    if (long && depth) {
      body.push(
        locale === "en"
          ? depth.benefits
          : `Beneficios: progresión clara y práctica entre sesiones.`,
      );
    }
    return { intro, bodyParagraphs: body };
  }

  // ── French (Québec) — primary SEO copy ─────────────────────────────────────
  const introParts: string[] = [];
  introParts.push(
    `Vous cherchez des cours de ${labelLc} à ${city.name} ou un ${tn} qui cadre avec votre réalité (horaire, niveau, format)? Voici ce qui compte avant de réserver sur Pratiqo — sans nombre inventé de professeurs : tu compares des profils réels.`,
  );
  introParts.push(
    hub
      ? `${hub.localContext} Sur la plateforme, vérifie le mode de cours, les tarifs affichés et les éléments de confiance sur chaque fiche.`
      : `${city.localContext} Les bonnes décisions viennent souvent d’un objectif clair et d’une communication directe avec le professeur.`,
  );
  introParts.push(
    `Les recherches du type « cours de ${labelLc} à ${city.name} », « ${tn} à ${city.name} » ou « prof ${labelLc} ${city.name} » mènent ici : l’important est de jumeler intention (enfant, examen, loisir) et méthode.`,
  );
  const intro = introParts.join(" ");

  const body: string[] = [];

  if (depth) {
    body.push(`Intention de recherche : ${depth.searchIntent}`);
    body.push(`Pour qui : ${depth.whoFor}`);
    body.push(`Ce qu’on veut souvent : ${depth.whatTheyWant}`);
    body.push(`Pourquoi un accompagnement aide : ${depth.benefits}`);
    body.push(`Comment comparer des profils : ${depth.howToCompare}`);
  } else {
    body.push(subject.seoIntro);
    body.push(subject.studentIntent);
    body.push(subject.parentIntent);
  }

  body.push(
    `Sur Pratiqo, l’identité des personnes qui enseignent est vérifiée. Tu vois des disponibilités et des modes (en ligne, à domicile, hybride) selon ce que chaque prof indique — nous ne fabriquons pas de fausse disponibilité.`,
  );

  body.push(
    `Quand tu cherches un ${tn} à ${city.name}, pense à la saison : l’hiver, les trajets et les activités parascolaires changent ce qui est réaliste. Les cours de ${labelLc} à ${city.name} peuvent rester réguliers si tu bloques une plage horaire honnête avec le prof ou la prof.`,
  );

  if (long && depth) {
    for (const extra of depth.longExtras) body.push(extra);
    body.push(
      `Pour aller plus loin localement : ${city.region} offre des contextes variés (familles, étudiants, horaires serrés). Si tu hésites entre plusieurs profs, envoie un message court sur ton objectif précis : un bon ${tn} répond avec un plan sur 3 à 4 séances plutôt qu’avec des promesses vagues.`,
    );
    body.push(
      `Côté parents : demandez comment le suivi complète l’école sans la remplacer, surtout pour le tutorat. Côté adultes et ados : demandez comment la pratique entre les cours est conçue — la progression tient autant aux routines qu’au talent.`,
    );
  } else {
    body.push(
      `Dans une ville comme ${city.name}, la taille du marché change, mais les bonnes pratiques restent : consignes claires, attentes réalistes, et une première rencontre pour ajuster le plan si besoin.`,
    );
    body.push(
      `Si les profils locaux sont encore peu nombreux pour ${labelLc}, l’en ligne reste une option solide au Québec : plusieurs enseignants accompagnent des élèves partout dans la province avec la même exigence de qualité.`,
    );
  }

  body.push(
    `Rappel utile pour le référencement naturel sans sacrifier la lisibilité : cours de ${labelLc} à ${city.name}, ${tn} à ${city.name}, prof ${labelLc} ${city.name} — ce sont des formulations que les gens utilisent vraiment; ce texte vise à répondre à ces intentions avec du contenu utile, pas à répéter mécaniquement les mots-clés.`,
  );

  // Target rough word bands without a hard server-side counter loop in production
  const wc = body.reduce((n, p) => n + wordCount(p), 0);
  if (long && wc < 480) {
    body.push(
      `Pour ${city.name}, pense aussi à la logistique (transport, stationnement, horaires) si tu choisis du présentiel : clarifie le lieu, la durée des leçons et ce que tu dois apporter (partition, cahier, casque, instrument). Un enseignant en ${disciplineName} peut t’aider à poser une routine de pratique réaliste dès les premières semaines — c’est souvent là que se joue la différence sur trois mois.`,
    );
  }
  if (!long && wc > 520) {
    // trim not implemented — non-priority stays under via fewer branches above
  }

  return { intro, bodyParagraphs: body };
}

export function buildTutorCitySeoContent(input: {
  locale: Locale;
  city: LocalSeoCity;
  citySlug: string;
}): { intro: string; bodyParagraphs: string[] } {
  const { locale, city, citySlug } = input;
  const long = isTutorCityLongForm(citySlug);
  const hub = PRIORITY_CITY_HUBS[citySlug];

  if (locale !== "fr") {
    const intro =
      locale === "en"
        ? `Find a private tutor in ${city.name}, QC for homework, school subjects, languages or music. Real profiles on Pratiqo — no fake teacher counts.`
        : `Encuentra tutoría en ${city.name}, QC. Perfiles reales en Pratiqo.`;
    return {
      intro,
      bodyParagraphs: [
        locale === "en"
          ? `People search “private tutor ${city.name}”, “homework help ${city.name}”, “private lessons ${city.name}”. Compare teaching mode, subjects and rates on each profile.`
          : `Compara modo de enseñanza y tarifas en cada perfil.`,
      ],
    };
  }

  const intro =
    `Trouvez un tuteur ou professeur privé à ${city.name} pour les devoirs, les matières scolaires, les langues et la musique. ` +
    `Sur Pratiqo, vous parcourez des profils réels : nous n’affichons pas de nombre fictif d’enseignants — la disponibilité dépend des personnes actives sur la plateforme.`;

  const ctx = hub?.localContext ?? city.localContext;
  const body: string[] = [];

  body.push(
    `À ${city.name}, les intentions ressemblent à « tuteur privé ${city.name} », « tutorat ${city.name} », « aide aux devoirs ${city.name} », « cours privés ${city.name} » ou « prof privé ${city.name} ». L’enjeu n’est pas seulement de trouver quelqu’un, mais une personne avec la bonne matière, un mode de cours qui fonctionne (présentiel ou en ligne) et une communication claire sur le prix.`,
  );

  body.push(ctx);

  body.push(
    `Pour le tutorat durable, plusieurs familles gagnent avec des séances plus courtes mais plus fréquentes, surtout pour l’aide aux devoirs. Le tuteur aide à comprendre et à organiser; l’école et l’élève gardent leur rôle — c’est plus sain sur la durée que de chercher quelqu’un qui ferait les devoirs à la place de l’élève.`,
  );

  body.push(
    `Pratiqo met de l’avant la vérification d’identité. Certaines fiches montrent aussi d’autres validations : lis le profil en entier avant d’écrire, et pose une question directe sur ton objectif (niveau scolaire, langue, instrument, etc.).`,
  );

  if (long) {
    body.push(
      `Dans une zone comme ${city.name} (${city.region}), la diversité des besoins explose : secondaire, cégep, musique, langues, francisation. Une stratégie efficace est de commencer par une priorité (ex. : maths ou français), puis d’évaluer après quelques semaines plutôt que de tout mélanger dès la première rencontre.`,
    );
    body.push(
      `Côté hiver et déplacements, combiner en ligne et en présentiel peut éviter l’abandon : clarifie avec le tuteur comment la communication fonctionne entre les séances (cahier, messages courts, retour aux parents si c’est pertinent).`,
    );
    body.push(
      `Si tu es enseignant·e à ${city.name}, une fiche transparente (expérience, niveaux, tarif, modes) aide les bonnes familles à te trouver au bon moment — surtout en période d’examens ou de rentrée.`,
    );
  } else {
    body.push(
      `Même avec un marché plus petit, un tuteur peut stabiliser les bases et installer une habitude de travail régulière — surtout si l’objectif est clair dès le début.`,
    );
  }

  body.push(
    `Enfin, ne confonds pas prix bas et valeur : regarde la cohérence du profil (parcours, clarté, réponses à tes questions). Un bon match humain et une méthode explicite valent souvent plus qu’une heure « pas chère » sans structure.`,
  );

  const wc = body.reduce((n, p) => n + wordCount(p), 0);
  if (long && wc < 480) {
    body.push(
      `Autour de ${city.name}, pense aussi aux trajets et au stationnement si tu veux du présentiel pour plusieurs matières: organiser une même fenêtre horaire avec l’élève réduit la dérive et le stress. Pour les langues et la musique, la combinaison présentiel + ligne fonctionne souvent quand les saisons ou le sport bouleversent l’horaire.`,
    );
  }

  return { intro, bodyParagraphs: body };
}

// ── FAQs ──────────────────────────────────────────────────────────────────────

export function buildCourseCityFaqs(input: {
  locale: Locale;
  city: LocalSeoCity;
  subject: LocalSeoSubject;
  disciplineName: string;
  disciplineSlug: string;
}): { question: string; answer: string }[] {
  const { locale, city, subject, disciplineName, disciplineSlug } = input;
  const d = getDepth(disciplineSlug);
  const angle = d?.whatTheyWant ?? subject.faqAngle;

  if (locale === "en") {
    return [
      {
        question: `How much do ${subject.label} lessons cost in ${city.name}?`,
        answer:
          "Rates vary by experience, level, and format (online or in person). On Pratiqo, each profile shows a clear price so you can compare before messaging — with no hidden platform fees for basic contact.",
      },
      {
        question: `How do I choose a ${subject.teacherNoun} in ${city.name} for my situation?`,
        answer: `Start with your goal and context (${angle}). Then read the background, reviews when available, verifications, and teaching mode. Ask a specific question — a strong teacher answers with a method, not vague promises.`,
      },
      {
        question: `Can ${subject.label} lessons happen at home or online in ${city.name}?`,
        answer:
          "Often yes — it depends on the profile. Many teachers offer one or both. Check each listing; in Québec winters, many families mix formats week to week.",
      },
      {
        question: `Does Pratiqo verify ${disciplineName} teachers?`,
        answer:
          "Yes: identity is verified to teach on Pratiqo. Other badges may appear on the profile. They help you choose, but your judgment still matters.",
      },
      {
        question: `Can we start with a first lesson or short meeting for ${subject.label} in ${city.name}?`,
        answer:
          "Many teachers are open to a first meeting or short session to align on a plan. Ask politely in your message after creating an account.",
      },
      {
        question: `Is this aligned with Québec programs or my situation in ${city.name}?`,
        answer:
          "Mention your level (elementary, high school, college, adult) and what you want to improve. Many teachers know local expectations; either way, clarity on your real goals makes the difference.",
      },
    ];
  }

  if (locale === "es") {
    return [
      {
        question: `¿Cuánto cuestan las clases de ${subject.label} en ${city.name}?`,
        answer:
          "El precio varía según experiencia, nivel y formato (online o presencial). En Pratiqo, cada perfil muestra una tarifa clara para comparar antes de escribir — sin cargos ocultos de plataforma para el contacto básico.",
      },
      {
        question: `¿Cómo elegir un ${subject.teacherNoun} en ${city.name} para mi caso?`,
        answer: `Empezá por tu objetivo y contexto (${angle}). Luego leé trayectoria, reseñas si hay, verificaciones y modalidad. Hacé una pregunta concreta: un buen profe responde con método, no promesas vagas.`,
      },
      {
        question: `¿Las clases de ${subject.label} pueden ser a domicilio u online en ${city.name}?`,
        answer:
          "A menudo sí — depende del perfil. Muchos profes ofrecen una u otra modalidad, o ambas. Revisá cada ficha; en invierno en Québec, muchas familias combinan según la semana.",
      },
      {
        question: `¿Pratiqo verifica a los profesores de ${disciplineName}?`,
        answer:
          "Sí: la identidad se verifica para enseñar en Pratiqo. Pueden aparecer otras validaciones en el perfil. Ayudan a elegir, pero tu criterio sigue siendo clave.",
      },
      {
        question: `¿Se puede empezar con una primera clase o reunión corta de ${subject.label} en ${city.name}?`,
        answer:
          "Muchos profesores aceptan una primera reunión o sesión corta para alinear el plan. Pedilo con cortesía en tu mensaje después de crear tu cuenta.",
      },
      {
        question: `¿Encaja con programas de Québec o mi realidad en ${city.name}?`,
        answer:
          "Mencioná tu nivel (primaria, secundaria, cégep, adulto) y qué querés mejorar. Muchos profes conocen expectativas locales; en todo caso, claridad en tus objetivos reales marca la diferencia.",
      },
    ];
  }

  return [
    {
      question: `Combien coûte un cours de ${subject.label} à ${city.name}?`,
      answer: `Ça varie selon l’expérience, le niveau et le format (en ligne ou en personne). Sur Pratiqo, chaque profil affiche un tarif clair pour comparer avant d’écrire — sans frais cachés de plateforme du côté élève pour la prise de contact de base.`,
    },
    {
      question: `Comment choisir un ${subject.teacherNoun} à ${city.name} pour mon cas?`,
      answer: `Commence par ton objectif et ton contexte (${angle}). Ensuite, lis le parcours, les avis s’il y en a, les vérifications et le mode d’enseignement. Écris une question précise : un bon prof répond avec une méthode, pas avec des promesses vagues.`,
    },
    {
      question: `Les cours de ${subject.label} peuvent-ils se faire à la maison ou en ligne à ${city.name}?`,
      answer: `Souvent oui — ça dépend du profil. Plusieurs enseignants proposent l’un ou l’autre, ou les deux. Vérifie sur chaque fiche le mode affiché; en hiver au Québec, beaucoup de familles combinent selon les semaines.`,
    },
    {
      question: `Est-ce que Pratiqo vérifie les professeurs de ${disciplineName}?`,
      answer: `Oui : l’identité est vérifiée pour enseigner sur Pratiqo. D’autres éléments peuvent apparaître sur le profil (par exemple des validations liées aux compétences). Ça aide à choisir, sans remplacer ton jugement.`,
    },
    {
      question: `Peut-on avoir un premier cours ou une rencontre pour des cours de ${subject.label} à ${city.name}?`,
      answer: `Plusieurs professeurs sont ouverts à une première rencontre ou une séance courte pour ajuster le plan. Demande-le poliment dans ton message après avoir créé ton compte.`,
    },
    {
      question: `Est-ce adapté au programme québécois ou à ma réalité à ${city.name}?`,
      answer: `Mentionne ton niveau (primaire, secondaire, cégep, adulte) et ce que tu veux améliorer. Beaucoup d’enseignants connaissent les attentes locales; dans tous les cas, l’alignement sur tes objectifs réels fait la différence.`,
    },
  ];
}

export function buildTutorCityFaqs(city: LocalSeoCity, locale: Locale = "fr"): { question: string; answer: string }[] {
  if (locale === "en") {
    return [
      {
        question: `How do I find a private tutor in ${city.name} for tutoring or homework help?`,
        answer:
          "On Pratiqo, filter by subject and read real profiles (rate, lesson mode, experience). We do not invent teacher counts: you see who is available, then message with a clear goal.",
      },
      {
        question: `What is the difference between a private tutor, homework help, and private lessons in ${city.name}?`,
        answer:
          "The words differ; the idea is personalized support for a student or adult. Focus on subject, level, and method — not only the title on the listing.",
      },
      {
        question: `Can sessions be at home or online in ${city.name}?`,
        answer:
          "It depends on the profile. Many offer online, in person, or both. In winter, online can keep consistency when travel is harder.",
      },
      {
        question: `How do I avoid a poor match with a local teacher in ${city.name}?`,
        answer:
          'Ask a precise question about your goal (e.g. "two sessions per week for secondary 4"). A strong tutor answers with a simple structure and realistic expectations.',
      },
      {
        question: "Does Pratiqo verify tutors?",
        answer:
          "Yes: identity is verified to teach. Other profile elements may help. Read the full profile before committing.",
      },
      {
        question: `Can we start with a short session in ${city.name}?`,
        answer:
          "Often yes — ask directly. A first meeting helps confirm fit and a plan for the next few weeks.",
      },
    ];
  }

  if (locale === "es") {
    return [
      {
        question: `¿Cómo encontrar un tutor privado en ${city.name} para tutoría o apoyo escolar?`,
        answer:
          "En Pratiqo, filtrá por materia y leé perfiles reales (tarifa, modalidad, experiencia). No inventamos cantidades: ves quién está disponible y escribís con un objetivo claro.",
      },
      {
        question: `¿Cuál es la diferencia entre tutor privado, apoyo escolar y clases particulares en ${city.name}?`,
        answer:
          "Cambian las palabras; la idea es acompañamiento personalizado. Mirá sobre todo materia, nivel y método — no solo el título del anuncio.",
      },
      {
        question: `¿Las sesiones pueden ser a domicilio u online en ${city.name}?`,
        answer:
          "Depende del perfil. Muchos ofrecen online, presencial o ambos. En invierno, online ayuda a mantener la regularidad cuando viajar cuesta más.",
      },
      {
        question: `¿Cómo evitar una mala experiencia con un profe local en ${city.name}?`,
        answer:
          'Hacé una pregunta precisa sobre tu objetivo (ej.: "2 sesiones por semana para secundaria 4"). Un buen tutor responde con estructura simple y expectativas realistas.',
      },
      {
        question: "¿Pratiqo verifica a los tutores?",
        answer:
          "Sí: la identidad se verifica para enseñar. Otros elementos pueden enriquecer la ficha. Leé el perfil completo antes de comprometerte.",
      },
      {
        question: `¿Se puede empezar con una sesión corta en ${city.name}?`,
        answer:
          "A menudo sí — pedilo directamente. Una primera reunión ayuda a validar la dinámica y el plan para las próximas semanas.",
      },
    ];
  }

  return [
    {
      question: `Comment trouver un tuteur privé à ${city.name} pour le tutorat ou l’aide aux devoirs?`,
      answer: `Sur Pratiqo, tu filtres par matière et tu lis des profils réels (tarif, mode de cours, expérience). Nous n’inventons pas le nombre de professeurs : tu vois qui est là, puis tu écris avec un objectif clair.`,
    },
    {
      question: `Quelle est la différence entre tuteur privé, aide aux devoirs et cours privés à ${city.name}?`,
      answer: `Les mots changent; l’idée est une personne qui accompagne l’élève ou l’adulte de façon personnalisée. Vérifie surtout la matière, le niveau et la méthode — pas seulement le titre sur l’annonce.`,
    },
    {
      question: `Les séances peuvent-elles être à domicile ou en ligne à ${city.name}?`,
      answer: `Ça dépend du profil. Beaucoup proposent l’en ligne, le présentiel ou les deux. En hiver, l’en ligne peut garder la régularité quand les déplacements deviennent lourds.`,
    },
    {
      question: `Comment éviter une mauvaise rencontre avec un prof privé à ${city.name}?`,
      answer: `Pose une question précise sur ton objectif (ex. : « 2 sessions par semaine pour le secondaire 4 »). Un bon tuteur répond avec une structure simple et des attentes réalistes.`,
    },
    {
      question: `Est-ce que Pratiqo vérifie les tuteurs?`,
      answer: `Oui : l’identité est vérifiée pour enseigner. D’autres éléments peuvent enrichir la fiche. Lis le profil au complet avant d’engager.`,
    },
    {
      question: `Peut-on commencer par une séance courte à ${city.name}?`,
      answer: `Souvent oui — demande-le directement. Une première rencontre aide à valider la dynamique et le plan sur quelques semaines.`,
    },
  ];
}

// ── JSON-LD builders ───────────────────────────────────────────────────────────

export function buildServiceJsonLd(input: {
  name: string;
  description?: string;
  cityName: string;
  serviceType: string;
  canonicalPath: string;
}): Record<string, unknown> {
  const url = `${SITE_URL}${withLocale(input.canonicalPath, ROUTING_DEFAULT_LOCALE)}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    areaServed: { "@type": "City", name: input.cityName },
    provider: {
      "@type": "Organization",
      name: "Pratiqo",
      url: `${SITE_URL}${withLocale("/", ROUTING_DEFAULT_LOCALE)}`,
    },
    serviceType: input.serviceType,
    url,
  };
}

export function buildFaqJsonLd(items: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export type BreadcrumbJsonLdItem = { name: string; path: string };

export function buildBreadcrumbJsonLd(items: BreadcrumbJsonLdItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${withLocale(item.path, ROUTING_DEFAULT_LOCALE)}`,
    })),
  };
}
