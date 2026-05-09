import type { DisciplineConfig } from "./types";

export const DISCIPLINES: DisciplineConfig[] = [
  {
    slug: "mathematiques",
    name: "Mathématiques",
    dbCategory: "Scolaire",
    dbDiscipline: "Mathématiques",
    metaTitle: (city, region) =>
      `Cours de mathématiques à ${city}, ${region} | Professeurs vérifiés – Pratiqo`,
    metaDescription: (city) =>
      `Trouvez un professeur de mathématiques à ${city}. Cours particuliers au secondaire, collégial ou université. Tuteurs vérifiés, réservation en ligne sur Pratiqo.`,
    heroTitle: (city) => `Cours de mathématiques à ${city}`,
    heroDesc: (city) =>
      `Progressez en maths avec un tuteur expérimenté près de chez vous à ${city}. Algèbre, fonctions, calcul différentiel — du secondaire au collégial.`,
    faq: [
      {
        question: `Comment trouver un bon tuteur en mathématiques à ${"{city}"}?`,
        answer:
          "Recherchez un tuteur avec de l'expérience au niveau scolaire de votre enfant. Lisez les avis d'autres familles, vérifiez le profil et réservez un premier cours d'essai avant de vous engager.",
      },
      {
        question: "Combien coûte un cours de maths particulier au Québec?",
        answer:
          "Les tarifs varient entre 25 $ et 70 $/heure selon l'expérience du tuteur et le niveau scolaire. Les cours en ligne sont souvent moins chers que les cours à domicile.",
      },
      {
        question: "Est-ce qu'un cours en ligne en mathématiques est aussi efficace?",
        answer:
          "Oui, à condition d'utiliser un tableau blanc partagé et une bonne connexion. Beaucoup d'élèves préfèrent le format en ligne pour la flexibilité qu'il offre.",
      },
    ],
  },
  {
    slug: "piano",
    name: "Piano",
    dbCategory: "Musique",
    dbDiscipline: "Piano",
    metaTitle: (city, region) =>
      `Cours de piano à ${city}, ${region} | Professeurs vérifiés – Pratiqo`,
    metaDescription: (city) =>
      `Trouvez un professeur de piano à ${city}. Cours pour débutants, enfants et adultes. Professeurs vérifiés avec réservation en ligne sur Pratiqo.`,
    heroTitle: (city) => `Cours de piano à ${city}`,
    heroDesc: (city) =>
      `Apprenez le piano avec un professeur passionné à ${city}. Cours pour tous les niveaux — débutant, intermédiaire, avancé. En ligne ou à domicile.`,
    faq: [
      {
        question: "À quel âge peut-on commencer les cours de piano?",
        answer:
          "La plupart des méthodes débutent vers 5–6 ans, quand la motricité fine est suffisamment développée. Certains professeurs travaillent avec des enfants de 4 ans avec des méthodes adaptées.",
      },
      {
        question: "Faut-il avoir un piano à la maison pour prendre des cours?",
        answer:
          "Un clavier numérique (88 touches, sensibilité au toucher) suffit pour commencer. L'achat d'un instrument acoustique peut attendre que la pratique soit régulière.",
      },
      {
        question: "Quelle est la fréquence idéale pour les cours de piano?",
        answer:
          "Un cours hebdomadaire de 30 à 60 minutes, accompagné de 15–20 minutes de pratique quotidienne, est le rythme recommandé pour progresser régulièrement.",
      },
    ],
  },
  {
    slug: "guitare",
    name: "Guitare",
    dbCategory: "Musique",
    dbDiscipline: "Guitare",
    metaTitle: (city, region) =>
      `Cours de guitare à ${city}, ${region} | Professeurs vérifiés – Pratiqo`,
    metaDescription: (city) =>
      `Trouvez un professeur de guitare à ${city}. Guitare acoustique, classique ou électrique. Cours pour tous les niveaux, réservation en ligne sur Pratiqo.`,
    heroTitle: (city) => `Cours de guitare à ${city}`,
    heroDesc: (city) =>
      `Apprenez la guitare avec un professeur expérimenté à ${city}. Guitare acoustique, classique ou électrique — pour enfants et adultes.`,
    faq: [
      {
        question: "Quelle guitare choisir pour commencer?",
        answer:
          "Pour un débutant adulte ou ado, une guitare acoustique à cordes en nylon (classique) est plus douce pour les doigts. Pour la musique pop/rock, une acoustique à cordes en acier ou une électrique conviennent.",
      },
      {
        question: "Combien de temps avant de jouer mes premières chansons?",
        answer:
          "Avec une pratique régulière de 15–20 minutes par jour, la plupart des débutants jouent leurs premières chansons simples après 4 à 8 semaines.",
      },
      {
        question: "Les cours de guitare en ligne sont-ils efficaces?",
        answer:
          "Oui. La guitare se prête très bien à l'enseignement en ligne — le professeur peut voir votre posture et votre technique via la caméra, et la latence est rarement un problème.",
      },
    ],
  },
  {
    slug: "musique",
    name: "Musique",
    dbCategory: "Musique",
    metaTitle: (city, region) =>
      `Cours de musique à ${city}, ${region} | Professeurs vérifiés – Pratiqo`,
    metaDescription: (city) =>
      `Trouvez un professeur de musique à ${city}. Piano, guitare, chant, violon et plus. Cours particuliers pour tous les âges sur Pratiqo.`,
    heroTitle: (city) => `Cours de musique à ${city}`,
    heroDesc: (city) =>
      `Découvrez tous les cours de musique disponibles à ${city} — piano, guitare, chant, violon, flûte et plus. Professeurs vérifiés, cours en ligne ou à domicile.`,
    faq: [
      {
        question: "Comment choisir le bon instrument pour commencer?",
        answer:
          "Choisissez un instrument qui vous attire vraiment — la motivation est la clé. Consultez un professeur de musique pour une recommandation adaptée à votre âge et à vos objectifs.",
      },
      {
        question: "Peut-on apprendre la musique à l'âge adulte?",
        answer:
          "Absolument. Les adultes apprennent différemment des enfants mais progressent souvent plus vite dans la compréhension théorique. Il n'est jamais trop tard pour commencer.",
      },
      {
        question: "Les cours de musique en ligne sont-ils de bonne qualité?",
        answer:
          "Oui, pour la plupart des instruments. Une connexion stable et une bonne caméra suffisent. Certains instruments (comme les cuivres) bénéficient davantage des cours en présentiel.",
      },
    ],
  },
  {
    slug: "espagnol",
    name: "Espagnol",
    dbCategory: "Langues",
    dbDiscipline: "Espagnol",
    metaTitle: (city, region) =>
      `Cours d'espagnol à ${city}, ${region} | Professeurs vérifiés – Pratiqo`,
    metaDescription: (city) =>
      `Trouvez un professeur d'espagnol à ${city}. Cours particuliers pour débutants et avancés, enfants et adultes. Réservation en ligne sur Pratiqo.`,
    heroTitle: (city) => `Cours d'espagnol à ${city}`,
    heroDesc: (city) =>
      `Apprenez l'espagnol avec un professeur natif ou certifié à ${city}. Cours pour tous les niveaux — voyage, affaires, préparation aux examens.`,
    faq: [
      {
        question: "Combien de temps pour apprendre l'espagnol de base?",
        answer:
          "Avec des cours réguliers (2–3 heures/semaine) et de la pratique autonome, la plupart des apprenants atteignent un niveau conversationnel de base en 3 à 6 mois.",
      },
      {
        question: "Est-il préférable d'apprendre l'espagnol mexicain ou espagnol d'Espagne?",
        answer:
          "Les deux variantes sont mutuellement intelligibles. Au Québec, l'espagnol d'Amérique latine est souvent plus pratique car c'est la variante des communautés hispanophones locales.",
      },
      {
        question: "Quel niveau d'espagnol dois-je avoir pour voyager en Amérique latine?",
        answer:
          "Un niveau A2–B1 (débutant intermédiaire) suffit pour les situations courantes. Des cours axés sur la conversation avec un natif sont les plus efficaces pour cette préparation.",
      },
    ],
  },
  {
    slug: "francais",
    name: "Français",
    dbCategory: "Langues",
    dbDiscipline: "Français",
    metaTitle: (city, region) =>
      `Cours de français à ${city}, ${region} | Professeurs vérifiés – Pratiqo`,
    metaDescription: (city) =>
      `Trouvez un professeur de français à ${city}. Cours de conversation, rédaction, grammaire ou francisation. Professeurs vérifiés sur Pratiqo.`,
    heroTitle: (city) => `Cours de français à ${city}`,
    heroDesc: (city) =>
      `Améliorez votre français à ${city} avec un professeur qualifié. Conversation, rédaction, grammaire, préparation au DALF — cours pour tous les besoins.`,
    faq: [
      {
        question: "Quelle est la différence entre cours de français et francisation?",
        answer:
          "La francisation désigne les programmes d'apprentissage du français pour les nouveaux arrivants au Québec. Les cours de français peuvent viser n'importe quel objectif : conversation, grammaire, examens.",
      },
      {
        question: "Puis-je améliorer mon français québécois avec un professeur particulier?",
        answer:
          "Oui. Un professeur particulier peut se concentrer sur le vocabulaire et les expressions propres au Québec, ce que les méthodes standardisées couvrent moins bien.",
      },
      {
        question: "Combien coûte un cours de français particulier à Montréal?",
        answer:
          "Les tarifs varient de 30 $ à 80 $/heure selon l'expérience du professeur. Les cours en ligne sont généralement moins chers et plus faciles à planifier.",
      },
    ],
  },
  {
    slug: "anglais",
    name: "Anglais",
    dbCategory: "Langues",
    dbDiscipline: "Anglais",
    metaTitle: (city, region) =>
      `Cours d'anglais à ${city}, ${region} | Professeurs vérifiés – Pratiqo`,
    metaDescription: (city) =>
      `Trouvez un professeur d'anglais à ${city}. Conversation, affaires, préparation IELTS/TOEFL. Cours particuliers pour tous les niveaux sur Pratiqo.`,
    heroTitle: (city) => `Cours d'anglais à ${city}`,
    heroDesc: (city) =>
      `Améliorez votre anglais à ${city} avec un professeur qualifié. Conversation quotidienne, anglais des affaires, préparation aux examens internationaux.`,
    faq: [
      {
        question: "Comment progresser rapidement en anglais parlé?",
        answer:
          "La clé est la pratique orale régulière avec un locuteur natif ou avancé. Des cours de conversation 2 à 3 fois par semaine, combinés à une exposition quotidienne (séries, podcasts), accélèrent nettement les progrès.",
      },
      {
        question: "Faut-il choisir un accent britannique ou américain?",
        answer:
          "Au Québec et au Canada, l'anglais nord-américain (accent canadien ou américain) est généralement plus pratique au quotidien. Les deux accents sont compris internationalement.",
      },
      {
        question: "Existe-t-il des cours d'anglais pour les gens d'affaires?",
        answer:
          "Oui. Plusieurs professeurs sur Pratiqo sont spécialisés en anglais des affaires — rédaction d'emails, présentations, négociations et vocabulaire sectoriel.",
      },
    ],
  },
  {
    slug: "francisation",
    name: "Francisation",
    dbCategory: "Langues",
    dbDiscipline: "Francisation",
    metaTitle: (city, region) =>
      `Cours de francisation à ${city}, ${region} | Pratiqo`,
    metaDescription: (city) =>
      `Trouvez un professeur de francisation à ${city}. Cours de français pour nouveaux arrivants — conversation, intégration, vie quotidienne. Pratiqo.`,
    heroTitle: (city) => `Cours de francisation à ${city}`,
    heroDesc: (city) =>
      `Apprenez le français québécois à ${city} avec un professeur patient et expérimenté. Cours adaptés aux nouveaux arrivants — conversation, formulaires, intégration.`,
    faq: [
      {
        question: "Qu'est-ce que la francisation au Québec?",
        answer:
          "La francisation est l'apprentissage du français pour les personnes dont ce n'est pas la langue maternelle, dans le contexte de leur intégration au Québec. Elle couvre la conversation quotidienne, les démarches administratives et la culture locale.",
      },
      {
        question: "Les cours de francisation sur Pratiqo sont-ils gratuits?",
        answer:
          "Les cours sur Pratiqo sont des cours particuliers payants. Pour des programmes gouvernementaux gratuits, consultez le MIFI (ministère de l'Immigration, de la Francisation et de l'Intégration du Québec). Les deux approches sont complémentaires.",
      },
      {
        question: "Combien de temps dure un programme de francisation?",
        answer:
          "La durée varie selon votre niveau de départ. Des cours particuliers intensifs permettent souvent de progresser plus vite qu'en groupe, car le contenu est entièrement adapté à vos besoins.",
      },
    ],
  },
];

export function findDisciplineBySlug(slug: string): DisciplineConfig | undefined {
  return DISCIPLINES.find((d) => d.slug === slug);
}

/** Top cities × disciplines combos to pre-render at build time. */
export const DISCIPLINE_CITY_PAIRS: Array<{ disciplineSlug: string; citySlug: string }> =
  DISCIPLINES.flatMap((d) =>
    [
      "montreal", "quebec", "laval", "longueuil", "sherbrooke",
      "trois-rivieres", "gatineau", "drummondville", "levis", "saint-georges",
    ].map((citySlug) => ({ disciplineSlug: d.slug, citySlug }))
  );
