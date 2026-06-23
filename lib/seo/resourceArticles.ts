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
    description: "Guide à venir — critères pour choisir un cours de cuisine privé au Québec.",
    category: "Loisirs",
    publishedAt: "2026-07-01",
    status: "draft",
    markdownFile: "cours-cuisine-prive.md",
    relatedPaths: ["/cours/cuisine", "/trouver-un-prof"],
    faq: [],
  },
  {
    slug: "choisir-coach-entraineur-prive",
    title: "Comment choisir un coach ou entraîneur privé",
    description: "Guide à venir — encadrement sécuritaire et attentes réalistes pour un coach privé.",
    category: "Bien-être",
    publishedAt: "2026-07-01",
    status: "draft",
    markdownFile: "choisir-coach-entraineur-prive.md",
    relatedPaths: ["/cours/coach-entraineur", "/trouver-un-prof"],
    faq: [],
  },
  {
    slug: "choisir-cours-danse",
    title: "Cours de danse : choisir le bon style et le bon professeur",
    description: "Guide à venir — styles, niveaux et questions à poser avant un cours de danse privé.",
    category: "Loisirs",
    publishedAt: "2026-07-01",
    status: "draft",
    markdownFile: "choisir-cours-danse.md",
    relatedPaths: ["/cours/danse", "/trouver-un-prof"],
    faq: [],
  },
  {
    slug: "choisir-cours-arts-martiaux",
    title: "Cours d'arts martiaux pour débutants : choisir un encadrement sécuritaire",
    description: "Guide à venir — sécurité, progression et choix d'un professeur pour débutants.",
    category: "Sports",
    publishedAt: "2026-07-01",
    status: "draft",
    markdownFile: "choisir-cours-arts-martiaux.md",
    relatedPaths: ["/cours/arts-martiaux", "/trouver-un-prof"],
    faq: [],
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
