import type { FAQItem } from "@/lib/seo/types";

export type ResourceArticleStatus = "published" | "draft";

export type ResourceArticleMeta = {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  status: ResourceArticleStatus;
  faq: FAQItem[];
  /** Related `/cours/...` or marketing paths for internal linking. */
  relatedPaths: string[];
  /** Markdown file basename under content/ressources/ */
  markdownFile: string;
};

export const RESOURCE_ARTICLES: ResourceArticleMeta[] = [
  {
    slug: "comment-choisir-professeur-prive-quebec",
    title: "Comment choisir un professeur privé au Québec",
    description:
      "Critères concrets pour choisir un professeur privé au Québec : objectifs, format, expérience, communication et sécurité — sans promesses marketing.",
    category: "Guides",
    publishedAt: "2026-06-16",
    status: "published",
    markdownFile: "comment-choisir-professeur-prive-quebec.md",
    relatedPaths: ["/trouver-un-prof", "/devenir-professeur", "/cours/mathematiques/montreal"],
    faq: [
      {
        question: "Combien de temps avant un examen devrais-je commencer?",
        answer:
          "Idéalement dès que les difficultés apparaissent, pas la veille d'un examen. Un suivi régulier laisse le temps d'identifier les lacunes et de consolider les bases.",
      },
      {
        question: "Un professeur en ligne peut-il convenir pour mon enfant?",
        answer:
          "Oui pour plusieurs matières, si l'enfant a un espace calme et une bonne connexion. Pour la musique ou certaines activités pratiques, le présentiel peut rester préférable selon le profil.",
      },
      {
        question: "Dois-je choisir le professeur le moins cher?",
        answer:
          "Le tarif est un critère, pas le seul. Comparez l'expérience au bon niveau, la clarté du profil, les avis visibles et la compatibilité avec vos objectifs.",
      },
    ],
  },
  {
    slug: "professeur-prive-local-vs-plateforme-internationale",
    title: "Professeur privé ou plateforme internationale : pourquoi choisir local",
    description:
      "Pourquoi un professeur privé local au Québec peut mieux convenir qu'une grande plateforme internationale : fuseau horaire, contexte scolaire et relation de confiance.",
    category: "Guides",
    publishedAt: "2026-06-16",
    status: "published",
    markdownFile: "professeur-prive-local-vs-plateforme-internationale.md",
    relatedPaths: ["/trouver-un-prof", "/devenir-professeur", "/tarifs"],
    faq: [
      {
        question: "Une plateforme internationale est-elle toujours moins chère?",
        answer:
          "Pas nécessairement. Les tarifs varient selon le profil, le niveau et le format. Comparez le coût total, la disponibilité dans votre fuseau horaire et la pertinence du programme.",
      },
      {
        question: "Un professeur local comprend-il mieux le curriculum québécois?",
        answer:
          "Souvent oui pour les matières scolaires, car il connaît les programmes, les examens du MEQ et les attentes des écoles de la province.",
      },
      {
        question: "Puis-je combiner cours en ligne et professeur local?",
        answer:
          "Oui. Beaucoup d'élèves choisissent un professeur québécois en ligne pour la flexibilité, ou en présentiel quand la matière le demande.",
      },
    ],
  },
  {
    slug: "cours-cuisine-prive",
    title: "Cours de cuisine privé : apprendre à cuisiner sans pression",
    description:
      "Quand choisir un cours de cuisine privé, comment trouver un enseignant, quoi préparer avant la première leçon et comment chercher sur Pratiqo — sans promesses marketing.",
    category: "Loisirs",
    publishedAt: "2026-06-24",
    status: "published",
    markdownFile: "cours-cuisine-prive.md",
    relatedPaths: ["/cours/cuisine", "/trouver-un-prof", "/devenir-professeur"],
    faq: [
      {
        question: "Faut-il déjà savoir cuisiner pour un cours privé?",
        answer:
          "Non. Beaucoup de professeurs accompagnent des débutants complets. Précisez votre niveau et vos objectifs dans votre message initial.",
      },
      {
        question: "Un cours de cuisine en ligne est-il efficace?",
        answer:
          "Oui pour les démonstrations, les techniques et le suivi de recettes, si vous avez une caméra bien placée et les ingrédients préparés. Le présentiel reste utile pour certaines manipulations.",
      },
      {
        question: "Que faire si le professeur ne convient pas après une séance?",
        answer:
          "C'est normal de tester une première rencontre. Si le courant ne passe pas, cherchez un autre profil sur Pratiqo plutôt que de forcer un suivi qui ne vous convient pas.",
      },
    ],
  },
  {
    slug: "choisir-coach-entraineur-prive",
    title: "Comment choisir un coach ou entraîneur privé",
    description:
      "Sécurité, objectifs réalistes, communication et progression graduelle : guide pour choisir un coach ou entraîneur privé au Québec — sans promesses de transformation corporelle.",
    category: "Bien-être",
    publishedAt: "2026-06-24",
    status: "published",
    markdownFile: "choisir-coach-entraineur-prive.md",
    relatedPaths: ["/cours/coach-entraineur", "/trouver-un-prof", "/devenir-professeur"],
    faq: [
      {
        question: "Un coach privé peut-il remplacer un suivi médical?",
        answer:
          "Non. En cas de blessure, maladie ou condition particulière, consultez un professionnel de la santé avant de commencer ou reprendre un entraînement.",
      },
      {
        question: "À quelle fréquence prendre des séances?",
        answer:
          "Cela dépend de votre emploi du temps et de vos objectifs. Une à trois rencontres par semaine est fréquent; l'important est un rythme soutenable.",
      },
      {
        question: "Comment repérer des promesses trop belles?",
        answer:
          "Méfiez-vous des garanties de perte de poids rapide, de transformation corporelle assurée ou d'intensité extrême dès la première séance. Un bon coach progresse graduellement.",
      },
    ],
  },
  {
    slug: "choisir-cours-danse",
    title: "Cours de danse : choisir le bon style et le bon professeur",
    description:
      "Styles, niveau, format en ligne ou présentiel et critères pour choisir un professeur de danse — guide respectueux pour débutants, adultes et familles.",
    category: "Loisirs",
    publishedAt: "2026-06-24",
    status: "published",
    markdownFile: "choisir-cours-danse.md",
    relatedPaths: ["/cours/danse", "/trouver-un-prof", "/devenir-professeur"],
    faq: [
      {
        question: "Quel style choisir si je débute?",
        answer:
          "Commencez par un style qui vous attire et demandez au professeur s'il propose une initiation. Salsa, ballet, hip-hop et danse de salon n'ont pas la même exigence ni le même rythme d'apprentissage.",
      },
      {
        question: "Les cours de danse conviennent-ils aux enfants?",
        answer:
          "Oui, avec un professeur habitué aux jeunes et des séances adaptées à l'âge. Vérifiez l'expérience indiquée sur le profil et posez des questions sur la durée et l'ambiance du cours.",
      },
      {
        question: "Peut-on apprendre la danse en ligne?",
        answer:
          "Oui pour certains exercices de base et la coordination. Le présentiel aide souvent pour les corrections fines et les déplacements. Discutez du format avec le professeur.",
      },
    ],
  },
  {
    slug: "choisir-cours-arts-martiaux",
    title: "Cours d'arts martiaux pour débutants : choisir un encadrement sécuritaire",
    description:
      "Guide pour débutants : sécurité, respect, questions à poser avant de commencer et choix d'un enseignant — sans techniques de combat ni promesses irréalistes.",
    category: "Sports",
    publishedAt: "2026-06-24",
    status: "published",
    markdownFile: "choisir-cours-arts-martiaux.md",
    relatedPaths: ["/cours/arts-martiaux", "/trouver-un-prof", "/devenir-professeur"],
    faq: [
      {
        question: "À quel âge peut-on commencer les arts martiaux?",
        answer:
          "Cela dépend du style et du professeur. Certains cours accueillent des enfants dès le primaire; d'autres visent surtout les adolescents ou adultes. Demandez les tranches d'âge sur le profil.",
      },
      {
        question: "Comment évaluer la sécurité d'un cours?",
        answer:
          "Un enseignant sérieux explique les règles, adapte l'intensité, propose un échauffement et répond clairement à vos questions sur les protections et le déroulement.",
      },
      {
        question: "Dois-je déjà être en forme pour commencer?",
        answer:
          "Non. La plupart des cours débutants partent de votre niveau actuel et progressent graduellement. Signalez toute limitation connue au professeur.",
      },
    ],
  },
  {
    slug: "choisir-cours-photographie",
    title: "Cours de photographie : apprendre à mieux voir, cadrer et créer",
    description:
      "Guide pratique pour débutants et amateurs : choisir un professeur de photographie, téléphone ou appareil photo, sujets abordés et recherche sur Pratiqo — sans promesses professionnelles.",
    category: "Loisirs",
    publishedAt: "2026-06-24",
    status: "published",
    markdownFile: "choisir-cours-photographie.md",
    relatedPaths: ["/cours/photographie", "/trouver-un-prof", "/devenir-professeur"],
    faq: [
      {
        question: "Faut-il un appareil photo coûteux pour commencer?",
        answer:
          "Non. Beaucoup de professeurs enseignent avec un téléphone ou un appareil d'entrée de gamme. Clarifiez votre équipement avant de réserver.",
      },
      {
        question: "Que apporter à une première leçon?",
        answer:
          "Quelques photos récentes à discuter, votre appareil chargé, une note de vos objectifs et les questions que vous avez sur la composition ou la lumière.",
      },
      {
        question: "Un cours privé garantit-il un portfolio professionnel?",
        answer:
          "Non. La progression dépend de votre pratique régulière et de vos objectifs. Un bon professeur vous guide; il ne promet pas de carrière ou de revenus garantis.",
      },
    ],
  },
];

export function getPublishedResourceArticles(): ResourceArticleMeta[] {
  return RESOURCE_ARTICLES.filter((a) => a.status === "published");
}

export function getResourceArticleBySlug(slug: string): ResourceArticleMeta | undefined {
  const article = RESOURCE_ARTICLES.find((a) => a.slug === slug);
  if (!article || article.status !== "published") return undefined;
  return article;
}

export function getResourceArticleCanonical(slug: string): string {
  return `https://www.pratiqo.ca/ressources/${slug}`;
}

/** Slugs of lifestyle resource guides linked from discipline hubs. */
export const LIFESTYLE_RESOURCE_SLUGS = [
  "cours-cuisine-prive",
  "choisir-coach-entraineur-prive",
  "choisir-cours-danse",
  "choisir-cours-arts-martiaux",
  "choisir-cours-photographie",
] as const;
