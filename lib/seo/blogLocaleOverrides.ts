import type { Locale } from "@/lib/i18n/types";
import type { FAQItem } from "./types";

/**
 * In-registry translations for selected blog slugs (French remains source in DB).
 * Extend with new slugs/locales as translations are added.
 */
export type BlogLocaleBundle = {
  title: string;
  excerpt: string;
  /** Full markdown body (no duplicate FAQ block — FAQ rendered separately when provided). */
  contentMarkdown: string;
  keyTakeaways: string[];
  faq: FAQItem[];
};

const EN_TUTEUR: BlogLocaleBundle = {
  title: "Online tutor or at-home tutor: which should you choose?",
  excerpt:
    "Compare flexibility, cost, focus, and fit for your family — plus how to pick the right format on Pratiqo.",
  keyTakeaways: [
    "Online expands your choices and often costs less; at-home suits younger kids and hands-on subjects.",
    "A calm workspace and shorter sessions help online focus.",
    "Many Pratiqo tutors offer both — you can switch formats as needs change.",
  ],
  faq: [
    {
      question: "Are online lessons as effective as in-person?",
      answer:
        "For most academic subjects, outcomes are comparable when the learner is motivated and has a quiet setup.",
    },
    {
      question: "My child struggles to focus on screen — what can we do?",
      answer:
        "Try 30–45 minute sessions, turn off notifications, keep the camera on, and reduce distractions in the room.",
    },
    {
      question: "Can the tutor come to our home?",
      answer:
        "Yes. Use Pratiqo search filters to find tutors who offer at-home lessons near you.",
    },
  ],
  contentMarkdown: `Families often ask: is it better to have a tutor travel to your home, or work online? Both can work — it depends on your child, your schedule, and the subject.

## Good news on Pratiqo

Many tutors offer **online, in-person, or hybrid** lessons. You can start online, switch to in-person if needed, or alternate week to week.

## Find the format that fits

[Search for a tutor →](/student/search)`,
};

const ES_TUTEUR: BlogLocaleBundle = {
  title: "Tutor online o a domicilio: ¿qué conviene?",
  excerpt:
    "Ventajas y límites de cada formato para decidir con claridad, según la edad, la materia y tu rutina.",
  keyTakeaways: [
    "El online amplía opciones y suele costar menos; el domicilio ayuda con chicos pequeños y materias prácticas.",
    "Un espacio tranquilo y sesiones más cortas mejoran el foco online.",
    "En Pratiqo muchos profes ofrecen ambos formatos y podés combinarlos.",
  ],
  faq: [
    {
      question: "¿El online rinde igual que el presencial?",
      answer:
        "En la mayoría de materias académicas, sí, si hay motivación y un lugar tranquilo para trabajar.",
    },
    {
      question: "Mi hijo no se concentra frente a la pantalla. ¿Qué hago?",
      answer:
        "Probá sesiones de 30–45 min, sin notificaciones y con la cámara encendida para mantener vínculo.",
    },
    {
      question: "¿El tutor puede ir a casa?",
      answer:
        "Sí. En Pratiqo podés filtrar por modo de clase y encontrar profes que se desplazan cerca tuyo.",
    },
  ],
  contentMarkdown: `Muchas familias se preguntan si conviene más un tutor que vaya a casa o uno online. Las dos opciones tienen sentido: depende del niño, del horario y de la materia.

## La buena noticia en Pratiqo

Muchos profes ofrecen **online, presencial o combinado**. Podés empezar online y pasar a domicilio si hace falta, o alternar.

## Encontrá el formato que encaja

[Buscar un tutor →](/student/search)`,
};

const EN_CHOISIR: BlogLocaleBundle = {
  title: "How to choose a great tutor for your child in Quebec",
  excerpt:
    "Five practical criteria: school level fit, subject mastery, rapport, verification, and parent communication.",
  keyTakeaways: [
    "Match experience to your child’s grade — primary needs differ from secondary.",
    "Ask a real subject question to test mastery before booking.",
    "Identity verification matters, especially for at-home lessons with minors.",
  ],
  faq: [
    {
      question: "Does my child need one-to-one tutoring or group support?",
      answer:
        "One-to-one helps when gaps are specific or when individualized pacing matters; groups can work for lighter catch-up.",
    },
    {
      question: "What age can private lessons start?",
      answer:
        "There’s no fixed minimum — tutors work with young learners for music, languages, and academics alike.",
    },
    {
      question: "How do I know a tutor is qualified on Pratiqo?",
      answer:
        "Review education, experience, reviews, and verification badges shown on the profile.",
    },
  ],
  contentMarkdown: `If your child needs extra help, choosing the right tutor matters more than picking the cheapest hourly rate. Here’s a practical checklist used by Quebec families.

## What you’re really looking for

A great tutor isn’t always the most credentialed — it’s someone who explains clearly, builds motivation, and adapts to your child’s pace.

## Five criteria

### 1. Experience at the right level
Primary and secondary needs differ. Confirm the tutor routinely supports students at your child’s stage.

### 2. Real mastery of the subject
Ask one concrete question tied to the curriculum. Confidence and clarity are signals of depth.

### 3. Human fit
Book an intro lesson when possible. Your child should feel safe asking questions and making mistakes.

### 4. Verification for safety
For home visits with minors, favour tutors with verified identity — easy to filter on Pratiqo.

### 5. Parent communication
Great tutors share quick updates after lessons and suggest practice between sessions.

## Questions to ask before booking

- What do you do if my child still doesn’t understand after several explanations?
- How do you handle last-minute cancellations?
- Do you share brief progress notes for parents?

## Take the next step

[Find a tutor for your child →](/student/search)`,
};

const ES_CHOISIR: BlogLocaleBundle = {
  title: "Cómo elegir un buen tutor para tu hijo o hija en Québec",
  excerpt:
    "Cinco criterios prácticos: nivel escolar, dominio de la materia, vínculo, verificación y comunicación con la familia.",
  keyTakeaways: [
    "El nivel importa: primaria y secundaria no son lo mismo.",
    "Una pregunta concreta del programa ayuda a evaluar dominio real.",
    "La verificación de identidad suma tranquilidad en clases a domicilio.",
  ],
  faq: [
    {
      question: "¿Necesita mi hijo clases individuales o un grupo?",
      answer:
        "Las individuales ayudan cuando hay lagunas claras o se necesita ritmo personalizado.",
    },
    {
      question: "¿A qué edad se pueden empezar clases particulares?",
      answer:
        "No hay mínimo fijo; hay tutores para música, idiomas y apoyo escolar desde edades tempranas.",
    },
    {
      question: "¿Cómo sé si el tutor está calificado en Pratiqo?",
      answer:
        "Mirá formación, experiencia, reseñas y badges de verificación en el perfil.",
    },
  ],
  contentMarkdown: `Elegir bien al tutor importa más que quedarse solo con el precio por hora. Acá va una guía práctica para familias en Québec.

## Lo que realmente buscás

No siempre gana el más diplomas: cuenta quien explica bien, motiva y se adapta al ritmo del alumno.

## Cinco criterios

### 1. Experiencia en el nivel correcto
Primaria y secundaria son mundos distintos. Confirmá que trabaja seguido con el ciclo de tu hijo.

### 2. Dominio real de la materia
Hacé una pregunta concreta del programa: la claridad de la respuesta es una señal fuerte.

### 3. Encaje humano
Una clase de prueba ayuda: tiene que poder preguntar sin miedo.

### 4. Verificación
Para clases a domicilio con menores, priorizá perfiles verificados en Pratiqo.

### 5. Comunicación con padres/madres
Buenos tutores comentan avances y dejan tareas razonables entre sesiones.

## Preguntas antes de reservar

- ¿Qué hacés si todavía no entiende después de varias explicaciones?
- ¿Cómo manejás cancelaciones de último momento?
- ¿Mandás un breve resumen después de cada clase?

## Siguiente paso

[Buscar un tutor →](/student/search)`,
};

const EN_DONNER: BlogLocaleBundle = {
  title: "How to give private lessons in Quebec",
  excerpt:
    "What to expect legally, how to price responsibly, and how to grow students with a trusted marketplace.",
  keyTakeaways: [
    "No province-wide license is required for typical private tutoring — credibility still matters.",
    "Track taxes once revenue crosses common small-supplier thresholds.",
    "Strong profiles, verification, and clear policies convert trust into bookings.",
  ],
  faq: [
    {
      question: "Do I need a degree to tutor privately?",
      answer:
        "No specific degree is legally required for private tutoring, but relevant expertise builds trust and pricing power.",
    },
    {
      question: "Should I register as self-employed?",
      answer:
        "If you declare tutoring income, yes — below common thresholds you may not need GST/QST registration.",
    },
    {
      question: "What should I charge?",
      answer:
        "Quebec hourly rates vary widely by subject and level — benchmark similar tutors on Pratiqo.",
    },
  ],
  contentMarkdown: `If you have expertise to share, Quebec’s demand for private lessons is strong — and the barrier to start is lower than many think.

## What the rules usually mean

There isn’t a Quebec-wide “tutor license” for typical private lessons. What matters is real expertise and the confidence families feel on your profile — especially when working with minors.

## Taxes and administration

If you earn tutoring income as self-employed income, plan for reporting. Small-supplier rules often apply below common revenue thresholds — validate details with Revenu Québec for your situation.

## Pricing with confidence

Scan comparable profiles and subjects on Pratiqo, then price for your experience, preparation time, and travel if applicable.

## Grow sustainably

Clear availability, fast replies, verified identity where possible, and predictable cancellation policies help you earn repeat students.

## Join Pratiqo as a teacher

[Become a teacher →](/become-teacher)`,
};

const ES_DONNER: BlogLocaleBundle = {
  title: "Cómo dar clases privadas en Québec",
  excerpt:
    "Marco práctico para arrancar con claridad: credibilidad, precios, fiscalidad y cómo conseguir alumnos.",
  keyTakeaways: [
    "No suele haber permiso único de “tutor” para clases privadas típicas — igual importa la experiencia real.",
    "Informate sobre umbrales de facturación y obligaciones impositivas.",
    "Perfil claro + respuesta rápida + verificación = más reservas.",
  ],
  faq: [
    {
      question: "¿Hace falta un título para dar clases privadas?",
      answer:
        "No hay requisito único para todas las materias; una base sólida en lo que enseñás suma credibilidad.",
    },
    {
      question: "¿Me conviene registrarme como trabajador autónomo?",
      answer:
        "Si declarás ingresos por clases, sí — los umbrales de IVA dependen de tu situación.",
    },
    {
      question: "¿Cuánto cobrar?",
      answer:
        "En Québec hay rangos amplios según materia y nivel; mirá perfiles parecidos en Pratiqo.",
    },
  ],
  contentMarkdown: `Si tenés conocimiento para compartir, el mercado de clases particulares en Québec suele acompañar — y arrancar puede ser más simple de lo que parece.

## Qué suelen decir las reglas

No existe un “permiso de tutor” provincial estándar para clases privadas clásicas. Lo que más pesa es tu dominio real y la confianza que transmitís — sobre todo con menores.

## Impuestos y gestión

Si facturás como autónomo, planificá declaraciones y posibles registros según facturación.

## Precios con criterio

Compará tutores similares en Pratiqo y ajustá por experiencia, preparación y desplazamiento.

## Crecer con buenas prácticas

Disponibilidad clara, respuestas rápidas, políticas de cancelación transparentes y verificación cuando puedas.

## Sumate como profesor

[Ser profesor →](/become-teacher)`,
};

export const BLOG_LOCALE_OVERRIDES: Partial<Record<string, Partial<Record<Locale, BlogLocaleBundle>>>> = {
  "tuteur-en-ligne-ou-a-domicile": {
    en: EN_TUTEUR,
    es: ES_TUTEUR,
  },
  "comment-choisir-tuteur-enfant-quebec": {
    en: EN_CHOISIR,
    es: ES_CHOISIR,
  },
  "donner-cours-prives-quebec": {
    en: EN_DONNER,
    es: ES_DONNER,
  },
};

export function getBlogLocaleBundle(slug: string, locale: Locale): BlogLocaleBundle | undefined {
  if (locale === "fr") return undefined;
  return BLOG_LOCALE_OVERRIDES[slug]?.[locale];
}

/** Key takeaway bullets for FR (source) when no locale bundle. */
export const BLOG_FR_KEY_TAKEAWAYS: Partial<Record<string, string[]>> = {
  "tuteur-en-ligne-ou-a-domicile": [
    "Le cours en ligne offre flexibilité et un plus grand choix; le cours à domicile rassure surtout les plus jeunes.",
    "Une connexion stable et un espace calme font toute la différence en virtuel.",
    "Sur Pratiqo, beaucoup de tuteurs proposent les deux formats.",
  ],
  "comment-choisir-tuteur-enfant-quebec": [
    "Vérifiez l’expérience au bon niveau scolaire et posez une question concrète sur la matière.",
    "Un premier cours d’essai révèle souvent la compatibilité humaine.",
    "Les profils vérifiés et les avis d’autres familles sont des repères solides.",
  ],
  "donner-cours-prives-quebec": [
    "Aucun permis « tuteur » universel n’est requis pour des cours privés typiques — la crédibilité compte.",
    "Planifiez fiscalité et tarifs en vous comparant à des profils proches sur Pratiqo.",
    "Une annonce claire, des réponses rapides et une politique d’annulation transparente fidélisent.",
  ],
};

export function getKeyTakeawaysForArticle(slug: string, locale: Locale): string[] {
  const bundle = getBlogLocaleBundle(slug, locale);
  if (bundle?.keyTakeaways?.length) return bundle.keyTakeaways;
  return BLOG_FR_KEY_TAKEAWAYS[slug] ?? [];
}
