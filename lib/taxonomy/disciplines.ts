/**
 * Flat teacher-facing discipline catalog.
 *
 * Teachers pick from this list directly (no required category → subcategory).
 * `internalGroup` is optional metadata for search/SEO/admin only.
 */

export type PratiqoDiscipline = {
  id: string;
  slug: string;
  labelFr: string;
  labelEn: string;
  labelEs?: string;
  internalGroup?: string;
  isActive: boolean;
  searchable: boolean;
};

export const MAX_TEACHER_DISCIPLINES = 5;

export const FEATURED_FILTER_DISCIPLINE_IDS = [
  "musique",
  "langues",
  "tuteurs",
  "photographie",
  "cuisine",
  "coach_sportif",
  "danse",
  "francisation",
] as const;

function item(
  id: string,
  labelFr: string,
  labelEn: string,
  labelEs: string,
  internalGroup: string,
): PratiqoDiscipline {
  return {
    id,
    slug: id,
    labelFr,
    labelEn,
    labelEs,
    internalGroup,
    isActive: true,
    searchable: true,
  };
}

export const PRATIQO_DISCIPLINES: PratiqoDiscipline[] = [
  item("musique", "Musique", "Music", "Música", "musique"),
  item("piano", "Piano", "Piano", "Piano", "musique"),
  item("guitare", "Guitare", "Guitar", "Guitarra", "musique"),
  item("chant", "Chant", "Singing", "Canto", "musique"),
  item("violon", "Violon", "Violin", "Violín", "musique"),
  item("batterie", "Batterie", "Drums", "Batería", "musique"),
  item("production_musicale", "Production musicale", "Music production", "Producción musical", "musique"),
  item("theorie_musicale", "Théorie musicale", "Music theory", "Teoría musical", "musique"),

  item("langues", "Langues", "Languages", "Idiomas", "langues"),
  item("anglais", "Anglais", "English", "Inglés", "langues"),
  item("espagnol", "Espagnol", "Spanish", "Español", "langues"),
  item("francais", "Français", "French", "Francés", "langues"),
  item("allemand", "Allemand", "German", "Alemán", "langues"),
  item("japonais", "Japonais", "Japanese", "Japonés", "langues"),
  item("italien", "Italien", "Italian", "Italiano", "langues"),
  item("portugais", "Portugais", "Portuguese", "Portugués", "langues"),
  item("mandarin", "Mandarin", "Mandarin", "Mandarín", "langues"),
  item("coreen", "Coréen", "Korean", "Coreano", "langues"),
  item("arabe", "Arabe", "Arabic", "Árabe", "langues"),
  item("langue_des_signes", "Langue des signes", "Sign language", "Lengua de señas", "langues"),

  item("francisation", "Francisation", "Francization / French integration", "Francización", "francisation"),
  item("francais_langue_seconde", "Français langue seconde", "French as a second language", "Francés como segunda lengua", "francisation"),
  item("preparation_tef_tcf", "Préparation TEF / TCF", "TEF / TCF preparation", "Preparación TEF / TCF", "francisation"),
  item("conversation_francaise", "Conversation française", "French conversation", "Conversación en francés", "francisation"),
  item("francais_professionnel", "Français professionnel", "Professional French", "Francés profesional", "francisation"),

  item("tuteurs", "Tuteurs académiques", "Academic tutoring", "Tutoría académica", "tutorat"),
  item("mathematiques", "Mathématiques", "Mathematics", "Matemáticas", "tutorat"),
  item("francais_scolaire", "Français scolaire", "School French", "Francés escolar", "tutorat"),
  item("anglais_scolaire", "Anglais scolaire", "School English", "Inglés escolar", "tutorat"),
  item("sciences", "Sciences", "Science", "Ciencias", "tutorat"),
  item("physique", "Physique", "Physics", "Física", "tutorat"),
  item("chimie", "Chimie", "Chemistry", "Química", "tutorat"),
  item("biologie", "Biologie", "Biology", "Biología", "tutorat"),
  item("histoire", "Histoire", "History", "Historia", "tutorat"),
  item("geographie", "Géographie", "Geography", "Geografía", "tutorat"),
  item("aide_aux_devoirs", "Aide aux devoirs", "Homework help", "Ayuda con los deberes", "tutorat"),
  item("preparation_aux_examens", "Préparation aux examens", "Exam preparation", "Preparación de exámenes", "tutorat"),
  item("methodes_etude", "Méthodes d’étude", "Study methods", "Métodos de estudio", "tutorat"),

  item("photographie", "Photographie", "Photography", "Fotografía", "media"),
  item("videographie", "Vidéographie", "Videography", "Videografía", "media"),
  item("montage_video", "Montage vidéo", "Video editing", "Edición de video", "media"),
  item("retouche_photo", "Retouche photo", "Photo editing", "Retoque fotográfico", "media"),
  item("creation_de_contenu", "Création de contenu", "Content creation", "Creación de contenido", "media"),

  item("cuisine", "Cuisine", "Cooking", "Cocina", "cuisine"),
  item("patisserie", "Pâtisserie", "Baking", "Pastelería", "cuisine"),
  item("cuisine_familiale", "Cuisine familiale", "Family cooking", "Cocina familiar", "cuisine"),
  item("cuisine_sante", "Cuisine santé", "Healthy cooking", "Cocina saludable", "cuisine"),
  item("cuisine_internationale", "Cuisine internationale", "International cooking", "Cocina internacional", "cuisine"),

  item("coach_sportif", "Coach sportif", "Fitness coach", "Entrenador deportivo", "sport"),
  item("mise_en_forme", "Mise en forme", "Fitness training", "Puesta en forma", "sport"),
  item("musculation", "Musculation", "Strength training", "Musculación", "sport"),
  item("course_a_pied", "Course à pied", "Running", "Running", "sport"),
  item("mobilite", "Mobilité", "Mobility", "Movilidad", "sport"),
  item("yoga", "Yoga", "Yoga", "Yoga", "sport"),
  item("pilates", "Pilates", "Pilates", "Pilates", "sport"),
  item("natation", "Natation", "Swimming", "Natación", "sport"),
  item("arts_martiaux", "Arts martiaux", "Martial arts", "Artes marciales", "sport"),

  item("danse", "Danse", "Dance", "Danza", "danse"),
  item("salsa", "Salsa", "Salsa", "Salsa", "danse"),
  item("bachata", "Bachata", "Bachata", "Bachata", "danse"),
  item("ballet", "Ballet", "Ballet", "Ballet", "danse"),
  item("danse_contemporaine", "Danse contemporaine", "Contemporary dance", "Danza contemporánea", "danse"),
  item("danse_urbaine", "Danse urbaine", "Urban dance", "Danza urbana", "danse"),
  item("danse_sociale", "Danse sociale", "Social dance", "Danza social", "danse"),

  item("arts", "Arts", "Arts", "Artes", "arts"),
  item("dessin", "Dessin", "Drawing", "Dibujo", "arts"),
  item("peinture", "Peinture", "Painting", "Pintura", "arts"),
  item("illustration", "Illustration", "Illustration", "Ilustración", "arts"),
  item("aquarelle", "Aquarelle", "Watercolor", "Acuarela", "arts"),
  item("theatre", "Théâtre", "Theatre", "Teatro", "arts"),
  item("ecriture_creative", "Écriture créative", "Creative writing", "Escritura creativa", "arts"),

  item("informatique", "Informatique", "Computer / digital skills", "Informática", "informatique"),
  item("initiation_ordinateur", "Initiation à l’ordinateur", "Computer basics", "Iniciación a la computadora", "informatique"),
  item("excel", "Excel", "Excel", "Excel", "informatique"),
  item("programmation", "Programmation", "Programming", "Programación", "informatique"),
  item("developpement_web", "Développement web", "Web development", "Desarrollo web", "informatique"),
  item("intelligence_artificielle", "Intelligence artificielle", "Artificial intelligence", "Inteligencia artificial", "informatique"),
  item("cybersecurite", "Cybersécurité", "Cybersecurity", "Ciberseguridad", "informatique"),
  item("robotique", "Robotique", "Robotics", "Robótica", "informatique"),

  item("developpement_professionnel", "Développement professionnel", "Professional development", "Desarrollo profesional", "pro"),
  item("prise_de_parole", "Prise de parole", "Public speaking", "Hablar en público", "pro"),
  item("communication", "Communication", "Communication", "Comunicación", "pro"),
  item("leadership", "Leadership", "Leadership", "Liderazgo", "pro"),
  item("preparation_entrevue", "Préparation entrevue", "Interview preparation", "Preparación de entrevistas", "pro"),
  item("cv_et_carriere", "CV et carrière", "Resume and career", "CV y carrera", "pro"),
  item("comptabilite", "Comptabilité", "Accounting", "Contabilidad", "pro"),
  item("entrepreneuriat", "Entrepreneuriat", "Entrepreneurship", "Emprendimiento", "pro"),
  item("marketing", "Marketing", "Marketing", "Marketing", "pro"),

  item("jeux_et_strategie", "Jeux et stratégie", "Games and strategy", "Juegos y estrategia", "jeux"),
  item("echecs", "Échecs", "Chess", "Ajedrez", "jeux"),
  item("poker", "Poker", "Poker", "Póker", "jeux"),
  item("jeux_de_societe", "Jeux de société", "Board games", "Juegos de mesa", "jeux"),
  item("logique", "Logique", "Logic", "Lógica", "jeux"),

  item("artisanat", "Artisanat", "Crafts", "Artesanía", "artisanat"),
  item("couture", "Couture", "Sewing", "Costura", "artisanat"),
  item("tricot", "Tricot", "Knitting", "Tejido", "artisanat"),
  item("menuiserie", "Menuiserie", "Woodworking", "Carpintería", "artisanat"),
  item("bricolage", "Bricolage", "DIY", "Bricolaje", "artisanat"),
  item("jardinage", "Jardinage", "Gardening", "Jardinería", "artisanat"),

  item("autre", "Autre", "Other", "Otro", "autre"),
];

const BY_ID = new Map(PRATIQO_DISCIPLINES.map((d) => [d.id, d]));

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s/_-]+/g, "_");
}

/** Old stored ids / labels → current catalog id. Never drop unknown rows. */
export const LEGACY_DISCIPLINE_ALIASES: Record<string, string> = {
  music: "musique",
  musique: "musique",
  language: "langues",
  languages: "langues",
  langues: "langues",
  academic: "tuteurs",
  academique: "tuteurs",
  tutoring: "tuteurs",
  tutorat: "tuteurs",
  tutorat_academique: "tuteurs",
  tuteurs_academiques: "tuteurs",
  scolaire: "tuteurs",
  arts_visuels: "arts",
  business: "developpement_professionnel",
  tech: "informatique",
  "tech_coding": "informatique",
  yoga_fitness: "yoga",
  sports: "coach_sportif",
  guitar: "guitare",
  singing: "chant",
  violin: "violon",
  drums: "batterie",
  photography: "photographie",
  cooking: "cuisine",
  dance: "danse",
  math: "mathematiques",
  maths: "mathematiques",
  spanish: "espagnol",
  english: "anglais",
  french: "francais",
  chess: "echecs",
  sewing: "couture",
  web_development: "developpement_web",
  coding: "programmation",
  fitness_coach: "coach_sportif",
  coach_trainer: "coach_sportif",
};

export function resolveDisciplineId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (BY_ID.has(trimmed)) return trimmed;
  const folded = fold(trimmed);
  if (BY_ID.has(folded)) return folded;
  const aliased = LEGACY_DISCIPLINE_ALIASES[folded];
  if (aliased && BY_ID.has(aliased)) return aliased;
  for (const d of PRATIQO_DISCIPLINES) {
    if (fold(d.labelFr) === folded || fold(d.labelEn) === folded || (d.labelEs && fold(d.labelEs) === folded)) {
      return d.id;
    }
  }
  return null;
}

export function getTaxonomyDisciplineById(id: string | null | undefined): PratiqoDiscipline | undefined {
  const resolved = resolveDisciplineId(id);
  return resolved ? BY_ID.get(resolved) : undefined;
}

export function getActiveDisciplines(): PratiqoDiscipline[] {
  return PRATIQO_DISCIPLINES.filter((d) => d.isActive);
}

export function getSearchableDisciplines(): PratiqoDiscipline[] {
  return PRATIQO_DISCIPLINES.filter((d) => d.isActive && d.searchable);
}

export function getFeaturedFilterDisciplines(): PratiqoDiscipline[] {
  return FEATURED_FILTER_DISCIPLINE_IDS.map((id) => BY_ID.get(id)).filter(
    (d): d is PratiqoDiscipline => Boolean(d),
  );
}

export function isActiveDisciplineId(id: string | null | undefined): boolean {
  const d = getTaxonomyDisciplineById(id);
  return Boolean(d?.isActive);
}

export function requiredDisciplineIds(): string[] {
  return [
    "photographie",
    "cuisine",
    "coach_sportif",
    "danse",
    "francisation",
    "piano",
    "espagnol",
    "mathematiques",
    "yoga",
    "excel",
    "developpement_web",
    "echecs",
    "couture",
    "musique",
    "langues",
    "tuteurs",
    "guitare",
    "anglais",
    "francais",
  ];
}
