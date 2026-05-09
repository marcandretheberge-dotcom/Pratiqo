import type { FAQItem, BlogPostMeta } from "./types";

/**
 * Blog post metadata registry.
 * Blog content lives in Supabase — this registry provides FAQ data for
 * FAQPage JSON-LD and metadata for internal linking between posts.
 * Slugs must match the `slug` column in the blog_posts table.
 */
export const BLOG_POST_META: BlogPostMeta[] = [
  {
    slug: "comment-choisir-tuteur-enfant-quebec",
    title: "Comment choisir un bon tuteur pour son enfant au Québec",
    description:
      "Les critères essentiels pour trouver le bon tuteur — expérience, vérification, compatibilité et communication.",
    category: "Scolaire",
    audience: ["parent"],
    keywords: ["tuteur privé québec", "choisir tuteur enfant", "cours particuliers québec"],
    faq: [
      {
        question: "Mon enfant a-t-il besoin d'un tuteur ou d'un soutien scolaire en groupe?",
        answer:
          "Les cours particuliers sont recommandés quand les lacunes sont spécifiques ou quand votre enfant a besoin d'un suivi individualisé. Un groupe peut fonctionner pour un soutien plus général.",
      },
      {
        question: "À quel âge peut-on commencer les cours particuliers?",
        answer:
          "Il n'y a pas d'âge minimum. Des tuteurs spécialisés travaillent avec des enfants dès le primaire, et même avant pour les activités comme la musique ou les langues.",
      },
      {
        question: "Comment savoir si le tuteur est qualifié?",
        answer:
          "Regardez son profil détaillé : formation, expérience, avis d'autres familles et niveau de vérification sur la plateforme.",
      },
    ],
    relatedLinks: [
      { href: "/student/search", label: "Trouver un tuteur au Québec" },
      { href: "/blog/combien-coute-tuteur-prive-quebec", label: "Combien coûte un tuteur privé?" },
      { href: "/blog/preparer-premier-cours-prive-enfant", label: "Préparer le premier cours" },
    ],
  },
  {
    slug: "combien-coute-tuteur-prive-quebec",
    title: "Combien coûte un tuteur privé au Québec?",
    description:
      "Fourchettes de prix réalistes par matière et niveau, facteurs qui influencent le tarif, et comment comparer les offres.",
    category: "Scolaire",
    audience: ["parent", "student"],
    keywords: ["prix tuteur privé québec", "tarif cours particuliers", "coût soutien scolaire"],
    faq: [
      {
        question: "Quel est le tarif moyen d'un tuteur particulier au Québec?",
        answer:
          "Les tarifs varient généralement entre 25 $ et 70 $/heure selon la matière, le niveau scolaire et l'expérience du tuteur. Les cours au collégial ou universitaire sont souvent plus chers.",
      },
      {
        question: "Les cours en ligne coûtent-ils moins cher?",
        answer:
          "Oui, souvent. Les cours en ligne éliminent les frais de déplacement et permettent aux tuteurs d'offrir des tarifs légèrement inférieurs tout en conservant une qualité équivalente.",
      },
      {
        question: "Y a-t-il des aides financières pour les cours particuliers au Québec?",
        answer:
          "Il n'existe pas de programme provincial universel. Certaines commissions scolaires offrent du soutien gratuit. Des organismes communautaires proposent parfois une aide aux familles à faible revenu.",
      },
    ],
    relatedLinks: [
      { href: "/student/search", label: "Voir les profils et tarifs des tuteurs" },
      { href: "/tarifs", label: "Tarifs Pratiqo" },
      { href: "/blog/comment-choisir-tuteur-enfant-quebec", label: "Comment choisir un tuteur" },
    ],
  },
  {
    slug: "tuteur-en-ligne-ou-a-domicile",
    title: "Tuteur en ligne ou à domicile : que choisir?",
    description:
      "Avantages et inconvénients des deux formats pour vous aider à choisir selon votre situation.",
    category: "Scolaire",
    audience: ["parent", "student"],
    keywords: ["tuteur en ligne québec", "cours à domicile", "soutien scolaire en ligne"],
    faq: [
      {
        question: "Les cours en ligne sont-ils aussi efficaces qu'en présentiel?",
        answer:
          "Pour la plupart des matières académiques, oui. Les études montrent des résultats comparables lorsque l'élève est motivé et dispose d'un espace calme. Pour certaines activités (musique, certains sports), le présentiel reste souvent préférable.",
      },
      {
        question: "Mon enfant a du mal à se concentrer en ligne. Que faire?",
        answer:
          "Optimisez l'espace de travail : bureau dégagé, caméra à hauteur des yeux, notifications désactivées. Des séances courtes (30–45 min) peuvent aussi être plus efficaces que de longues sessions.",
      },
      {
        question: "Le tuteur peut-il se déplacer à la maison?",
        answer:
          "Oui, plusieurs tuteurs proposent les cours à domicile. Filtrez par mode d'enseignement dans la recherche Pratiqo pour trouver ceux qui se déplacent près de chez vous.",
      },
    ],
    relatedLinks: [
      { href: "/student/search", label: "Rechercher un tuteur" },
      { href: "/blog/comment-choisir-tuteur-enfant-quebec", label: "Comment choisir un tuteur" },
    ],
  },
  {
    slug: "preparer-premier-cours-prive-enfant",
    title: "Comment préparer le premier cours privé de son enfant",
    description:
      "Conseils pratiques avant, pendant et après le premier cours pour maximiser les chances de succès.",
    category: "Scolaire",
    audience: ["parent"],
    keywords: ["premier cours particulier enfant", "préparer cours privé", "tuteur première séance"],
    faq: [
      {
        question: "Que faire si mon enfant ne se sent pas à l'aise avec le tuteur?",
        answer:
          "C'est normal après une seule séance. Donnez-lui deux ou trois cours pour voir si la relation s'améliore. Si le malaise persiste, cherchez un autre tuteur — la compatibilité humaine est cruciale.",
      },
      {
        question: "Dois-je rester présent pendant les cours de mon enfant?",
        answer:
          "Pour les jeunes enfants (moins de 10 ans), restez à proximité mais évitez d'intervenir. Pour les adolescents, une certaine indépendance favorise la confiance. Discutez-en avec le tuteur.",
      },
      {
        question: "Quelles informations partager avec le tuteur avant la première séance?",
        answer:
          "Communiquez le niveau scolaire, les matières concernées, les lacunes identifiées, le dernier bulletin et les objectifs (examens à venir, rattrapages). Plus le tuteur est informé, plus la première séance sera productive.",
      },
    ],
    relatedLinks: [
      { href: "/student/search", label: "Trouver un tuteur" },
      { href: "/blog/comment-choisir-tuteur-enfant-quebec", label: "Comment choisir un tuteur" },
    ],
  },
  {
    slug: "maths-secondaire-4-aide",
    title: "Mathématiques secondaire 4 : quand demander de l'aide?",
    description:
      "Comment reconnaître les signaux d'alarme et agir rapidement pour ne pas accumuler les lacunes en secondaire 4.",
    category: "Mathématiques",
    audience: ["student", "parent"],
    keywords: ["maths secondaire 4", "aide mathématiques secondaire", "tuteur maths québec"],
    faq: [
      {
        question: "Les mathématiques de secondaire 4 sont-elles vraiment difficiles?",
        answer:
          "Le secondaire 4 marque une transition importante vers des notions plus abstraites : fonctions, trigonométrie, statistiques avancées. Beaucoup d'élèves qui n'avaient pas de difficulté avant en ressentent ici.",
      },
      {
        question: "Combien de temps avant les examens devrait-on commencer le soutien?",
        answer:
          "Idéalement dès les premières difficultés — ne pas attendre les examens de fin d'année. Un accompagnement dès septembre ou octobre donne le temps de combler les lacunes progressivement.",
      },
      {
        question: "Un tuteur en mathématiques secondaire peut-il aussi aider pour le collégial?",
        answer:
          "Certains oui, selon leur formation. Vérifiez dans le profil du tuteur s'il mentionne de l'expérience au niveau collégial (calcul différentiel, algèbre linéaire, statistiques).",
      },
    ],
    relatedLinks: [
      { href: "/cours/mathematiques/montreal", label: "Tuteurs en maths à Montréal" },
      { href: "/cours/mathematiques/quebec", label: "Tuteurs en maths à Québec" },
      { href: "/student/search", label: "Tous les tuteurs en mathématiques" },
    ],
  },
  {
    slug: "cours-piano-enfants-choisir-professeur",
    title: "Cours de piano pour enfants : comment choisir un professeur?",
    description:
      "Ce que les parents doivent savoir pour trouver un professeur de piano adapté à leur enfant — méthode, personnalité, expérience.",
    category: "Musique",
    audience: ["parent"],
    keywords: ["cours de piano enfant québec", "professeur piano enfant", "leçons piano montréal"],
    faq: [
      {
        question: "À quel âge peut-on commencer les cours de piano?",
        answer:
          "La plupart des méthodes débutent vers 5–6 ans quand la motricité fine est suffisante. Certains professeurs travaillent avec des enfants de 4 ans via des approches ludiques adaptées.",
      },
      {
        question: "Faut-il un piano à la maison avant de commencer les cours?",
        answer:
          "Un clavier numérique de 88 touches avec sensibilité au toucher suffit pour commencer. L'achat d'un instrument acoustique peut attendre que la pratique soit régulière.",
      },
      {
        question: "Combien de temps avant que mon enfant joue ses premières pièces?",
        answer:
          "Avec une pratique quotidienne de 10 à 15 minutes, la plupart des débutants jouent leurs premières mélodies simples en 4 à 8 semaines.",
      },
    ],
    relatedLinks: [
      { href: "/cours/piano/montreal", label: "Professeurs de piano à Montréal" },
      { href: "/cours/piano/quebec", label: "Professeurs de piano à Québec" },
      { href: "/student/search", label: "Tous les professeurs de musique" },
    ],
  },
  {
    slug: "cours-espagnol-pres-chez-vous",
    title: "Cours d'espagnol près de chez vous : quoi vérifier?",
    description:
      "Comment évaluer un professeur d'espagnol, les questions à poser et les signaux de qualité à repérer.",
    category: "Langues",
    audience: ["student", "parent"],
    keywords: ["cours espagnol québec", "professeur espagnol montréal", "apprendre espagnol québec"],
    faq: [
      {
        question: "Est-il préférable de prendre des cours avec un locuteur natif?",
        answer:
          "Un locuteur natif apporte une authenticité de prononciation et d'expressions idiomatiques précieuse. Mais un professeur non-natif très qualifié et pédagogue peut être tout aussi efficace, surtout pour les débutants.",
      },
      {
        question: "Combien de temps pour atteindre un niveau conversationnel?",
        answer:
          "Avec 2 à 3 heures de cours par semaine et de la pratique autonome, la plupart des apprenants francophones atteignent un niveau conversationnel de base en 4 à 6 mois.",
      },
      {
        question: "Peut-on apprendre l'espagnol pour voyager en Amérique latine?",
        answer:
          "Absolument. Précisez cet objectif à votre professeur dès le départ. Des cours axés sur le vocabulaire de voyage, la conversation et la culture locale sont parfaitement adaptés.",
      },
    ],
    relatedLinks: [
      { href: "/cours/espagnol/montreal", label: "Professeurs d'espagnol à Montréal" },
      { href: "/cours/espagnol/quebec", label: "Professeurs d'espagnol à Québec" },
      { href: "/student/search", label: "Tous les professeurs de langues" },
    ],
  },
  {
    slug: "francisation-professeur-francais-pres",
    title: "Francisation : trouver un professeur de français près de chez soi",
    description:
      "Guide pour les nouveaux arrivants qui cherchent un professeur de français au Québec — options, coûts et conseils pratiques.",
    category: "Langues",
    audience: ["student"],
    keywords: ["francisation québec", "cours de français nouveaux arrivants", "apprendre français québec"],
    faq: [
      {
        question: "Quelle est la différence entre la francisation gouvernementale et les cours particuliers?",
        answer:
          "Les programmes du MIFI sont gratuits et se donnent en groupe. Les cours particuliers sont payants mais offrent un suivi personnalisé et s'adaptent à votre horaire. Les deux approches sont complémentaires.",
      },
      {
        question: "En combien de temps peut-on apprendre à communiquer en français québécois?",
        answer:
          "Cela dépend de votre langue maternelle et de l'intensité de la pratique. Des locuteurs d'autres langues romanes progressent souvent en 3 à 6 mois. Pour d'autres langues, comptez 6 à 18 mois.",
      },
      {
        question: "Les cours de francisation en ligne sont-ils efficaces?",
        answer:
          "Oui, notamment pour la conversation. Beaucoup de nouveaux arrivants combinent cours en ligne (flexibilité, prix) et sorties en français (cafés de conversation, activités communautaires) pour progresser plus vite.",
      },
    ],
    relatedLinks: [
      { href: "/cours/francisation/montreal", label: "Cours de francisation à Montréal" },
      { href: "/cours/francisation/laval", label: "Cours de francisation à Laval" },
      { href: "/cours/francais/montreal", label: "Professeurs de français à Montréal" },
      { href: "/student/search", label: "Trouver un professeur de français" },
    ],
  },
  {
    slug: "donner-cours-prives-quebec",
    title: "Comment donner des cours privés au Québec",
    description:
      "Tout ce que vous devez savoir pour commencer à donner des cours particuliers au Québec — légalité, tarifs, clients, plateformes.",
    category: "Scolaire",
    audience: ["teacher"],
    keywords: ["donner cours privés québec", "devenir tuteur québec", "enseigner cours particuliers"],
    faq: [
      {
        question: "Faut-il un diplôme pour donner des cours particuliers au Québec?",
        answer:
          "Aucun diplôme spécifique n'est légalement requis pour les cours particuliers privés. Cependant, un baccalauréat dans la matière enseignée ou une expérience pertinente augmente votre crédibilité et vos tarifs.",
      },
      {
        question: "Dois-je m'enregistrer comme travailleur autonome?",
        answer:
          "Si vous déclarez des revenus de cours particuliers, oui. En dessous de 30 000 $ de revenus, vous n'avez pas à vous inscrire à la TPS/TVQ. Consultez Revenu Québec pour les détails selon votre situation.",
      },
      {
        question: "Quel tarif facturer pour mes cours?",
        answer:
          "Les tarifs courants au Québec varient entre 25 $ et 80 $/heure selon la matière, le niveau et votre expérience. Regardez les profils de tuteurs similaires sur Pratiqo pour calibrer votre offre.",
      },
    ],
    relatedLinks: [
      { href: "/devenir-enseignant", label: "Rejoindre Pratiqo comme enseignant" },
      { href: "/tarifs", label: "Voir les plans pour enseignants" },
      { href: "/blog/prof-retraite-enseigner-pratiqo", label: "Prof retraité : enseigner avec Pratiqo" },
    ],
  },
  {
    slug: "prof-retraite-enseigner-pratiqo",
    title: "Prof retraité : enseigner quelques heures par semaine avec Pratiqo",
    description:
      "Comment des enseignants à la retraite partagent leur expertise, restent actifs et génèrent un revenu complémentaire en donnant des cours particuliers.",
    category: "Scolaire",
    audience: ["teacher"],
    keywords: ["professeur retraité cours privés", "enseignant retraité tuteur", "retraite enseignement québec"],
    faq: [
      {
        question: "Ma retraite sera-t-elle affectée si je donne des cours particuliers?",
        answer:
          "Les revenus de cours particuliers comme travailleur autonome n'affectent généralement pas votre rente de retraite (RRQ, RREGOP). Consultez votre conseiller financier pour valider selon votre régime spécifique.",
      },
      {
        question: "Combien d'heures par semaine est réaliste pour un prof retraité?",
        answer:
          "Beaucoup de retraités commencent avec 3 à 8 heures par semaine. C'est assez pour maintenir une routine agréable, générer un revenu complémentaire et rester connecté à l'enseignement sans stress.",
      },
      {
        question: "Est-ce que Pratiqo convient aux personnes moins à l'aise avec la technologie?",
        answer:
          "Pratiqo est conçu pour être simple à utiliser. L'inscription prend moins de 15 minutes. Si vous donnez des cours en ligne, un ordinateur avec caméra et une bonne connexion suffisent. Pour les cours en présentiel ou à domicile, aucune technologie supplémentaire n'est nécessaire.",
      },
    ],
    relatedLinks: [
      { href: "/devenir-enseignant", label: "Créer mon profil d'enseignant" },
      { href: "/tarifs", label: "Plans pour enseignants" },
      { href: "/blog/donner-cours-prives-quebec", label: "Comment donner des cours privés au Québec" },
    ],
  },
];

export function getBlogPostMeta(slug: string): BlogPostMeta | undefined {
  return BLOG_POST_META.find((p) => p.slug === slug);
}

export function getBlogPostFaq(slug: string): FAQItem[] | undefined {
  return BLOG_POST_META.find((p) => p.slug === slug)?.faq;
}

export function getRelatedPosts(slug: string, category: string): BlogPostMeta[] {
  return BLOG_POST_META.filter(
    (p) => p.slug !== slug && p.category === category
  ).slice(0, 3);
}
