import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Charte de confiance | Pratiqo",
  description:
    "Standards de la communauté Pratiqo pour des avis authentiques, respectueux et liés à de vrais cours payés.",
};

type Locale = "fr" | "en" | "es";

type Section = {
  title: string;
  body?: string;
  bullets: string[];
};

const CONTENT: Record<Locale, {
  languageLabel: string;
  title: string;
  subtitle: string;
  updated: string;
  back: string;
  support: string;
  examplesTitle: string;
  accepted: string;
  rejected: string;
  sections: Section[];
}> = {
  fr: {
    languageLabel: "Français",
    title: "Charte de confiance Pratiqo",
    subtitle:
      "Les avis doivent aider les élèves à choisir en confiance et aider les professeurs à progresser, sans attaque personnelle ni donnée privée.",
    updated: "Version 1.0 - 6 mai 2026",
    back: "Retour à l'accueil",
    support: "Pour demander une révision ou la suppression d'une donnée personnelle, écrivez à support@pratiqo.com.",
    examplesTitle: "Exemples",
    accepted: "Accepté : Le professeur explique vite; j'aurais aimé plus d'exemples pratiques.",
    rejected: "Rejeté : Le professeur est nul, quel débile.",
    sections: [
      {
        title: "1. Authenticité et expérience réelle",
        bullets: [
          "Un avis peut être publié seulement après un cours réellement complété et payé via Pratiqo.",
          "Chaque session de cours peut générer une seule évaluation.",
          "Les avis inventés, de vengeance ou de manipulation de note peuvent être supprimés.",
        ],
      },
      {
        title: "2. Respect et courtoisie",
        body: "La critique constructive est bienvenue; les attaques personnelles ne le sont pas.",
        bullets: [
          "Aucun propos haineux ou discriminatoire.",
          "Aucune insulte, vulgarité gratuite, intimidation ou menace.",
          "Le harcèlement peut entraîner une suspension ou un bannissement.",
        ],
      },
      {
        title: "3. Protection de la vie privée",
        body: "Pratiqo applique une logique de minimisation des données, notamment dans l'esprit de la Loi 25.",
        bullets: [
          "Ne publiez pas d'adresse exacte, de téléphone, d'email personnel ou d'information permettant d'identifier un tiers.",
          "Ne mentionnez pas la famille, d'autres élèves, des collègues ou toute personne non concernée par le cours.",
          "Les données personnelles publiées dans un avis peuvent être retirées sur demande.",
        ],
      },
      {
        title: "4. Pertinence du contenu",
        bullets: [
          "L'avis doit porter sur la qualité pédagogique, la préparation, la ponctualité, la communication ou le déroulement du cours.",
          "Les facteurs hors contrôle du professeur, comme la météo ou le transport, ne doivent pas influencer l'avis.",
          "Les litiges financiers doivent passer par le support plutôt que par les avis publics.",
        ],
      },
      {
        title: "5. Droit de réponse",
        bullets: [
          "Les professeurs peuvent répondre publiquement à chaque avis.",
          "Les réponses doivent rester professionnelles et respecter les mêmes standards que les avis.",
          "Une réponse ne doit pas révéler de données privées sur l'élève.",
        ],
      },
    ],
  },
  en: {
    languageLabel: "English",
    title: "Pratiqo Trust Charter",
    subtitle:
      "Reviews should help students choose with confidence and help teachers improve, without personal attacks or private information.",
    updated: "Version 1.0 - May 6, 2026",
    back: "Back home",
    support: "To request a review or removal of personal information, contact support@pratiqo.com.",
    examplesTitle: "Examples",
    accepted: "Accepted: The teacher explained quickly; I would have liked more practical examples.",
    rejected: "Rejected: The teacher is useless, what an idiot.",
    sections: [
      {
        title: "1. Authenticity and real experience",
        bullets: [
          "A review may be published only after a lesson was actually completed and paid through Pratiqo.",
          "Each lesson session can generate one review.",
          "Fake, retaliatory, or rating-manipulation reviews may be removed.",
        ],
      },
      {
        title: "2. Respect and courtesy",
        body: "Constructive criticism is welcome; personal attacks are not.",
        bullets: [
          "No hateful or discriminatory language.",
          "No insults, gratuitous profanity, intimidation, or threats.",
          "Harassment may result in suspension or banning.",
        ],
      },
      {
        title: "3. Privacy protection",
        body: "Pratiqo follows data minimization principles, including the spirit of Quebec Law 25.",
        bullets: [
          "Do not publish exact addresses, phone numbers, personal emails, or information that identifies a third party.",
          "Do not mention family members, other students, colleagues, or anyone not directly involved in the lesson.",
          "Personal information published in a review may be removed on request.",
        ],
      },
      {
        title: "4. Content relevance",
        bullets: [
          "Reviews should address teaching quality, preparation, punctuality, communication, or how the lesson went.",
          "Factors outside the teacher's control, such as weather or transportation, should not drive the review.",
          "Financial disputes should go through support instead of public reviews.",
        ],
      },
      {
        title: "5. Right of reply",
        bullets: [
          "Teachers may respond publicly to each review.",
          "Replies must remain professional and follow the same standards as reviews.",
          "A reply must not reveal private information about the student.",
        ],
      },
    ],
  },
  es: {
    languageLabel: "Español",
    title: "Carta de confianza Pratiqo",
    subtitle:
      "Las reseñas deben ayudar a estudiantes a elegir con confianza y a profes a mejorar, sin ataques personales ni datos privados.",
    updated: "Versión 1.0 - 6 de mayo de 2026",
    back: "Volver al inicio",
    support: "Para pedir una revisión o eliminar datos personales, escribí a support@pratiqo.com.",
    examplesTitle: "Ejemplos",
    accepted: "Aceptado: El profe explica rápido; me habría gustado tener más ejemplos prácticos.",
    rejected: "Rechazado: El profe no sirve, qué idiota.",
    sections: [
      {
        title: "1. Autenticidad y experiencia real",
        bullets: [
          "Una reseña solo puede publicarse después de una clase realmente completada y pagada por Pratiqo.",
          "Cada sesión de clase puede generar una sola evaluación.",
          "Las reseñas falsas, vengativas o hechas para manipular la nota pueden eliminarse.",
        ],
      },
      {
        title: "2. Respeto y cortesía",
        body: "La crítica constructiva es bienvenida; los ataques personales no.",
        bullets: [
          "Sin lenguaje de odio ni discriminación.",
          "Sin insultos, vulgaridad gratuita, intimidación ni amenazas.",
          "El acoso puede causar suspensión o expulsión.",
        ],
      },
      {
        title: "3. Protección de la privacidad",
        body: "Pratiqo aplica principios de minimización de datos, incluyendo el espíritu de la Ley 25 de Quebec.",
        bullets: [
          "No publiques direcciones exactas, teléfonos, emails personales ni información que identifique a terceros.",
          "No menciones familiares, otros estudiantes, colegas ni personas que no estén directamente relacionadas con la clase.",
          "Los datos personales publicados en una reseña pueden eliminarse a pedido.",
        ],
      },
      {
        title: "4. Relevancia del contenido",
        bullets: [
          "La reseña debe tratar sobre calidad pedagógica, preparación, puntualidad, comunicación o desarrollo de la clase.",
          "Factores fuera del control del profe, como clima o transporte, no deben determinar la reseña.",
          "Los desacuerdos financieros deben resolverse por soporte, no en reseñas públicas.",
        ],
      },
      {
        title: "5. Derecho de respuesta",
        bullets: [
          "Los profes pueden responder públicamente a cada reseña.",
          "Las respuestas deben ser profesionales y respetar los mismos estándares que las reseñas.",
          "Una respuesta no debe revelar datos privados del estudiante.",
        ],
      },
    ],
  },
};

function normalizeLang(value: string | string[] | undefined): Locale {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "en" || raw === "es" || raw === "fr" ? raw : "fr";
}

export default async function TrustCharterPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const params = await searchParams;
  const locale = normalizeLang(params.lang);
  const content = CONTENT[locale];

  return (
    <main className="min-h-screen bg-[#F9FAF8]">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-teal-700">
            {content.back}
          </Link>
          <div className="flex gap-2 text-xs font-semibold">
            {(["fr", "en", "es"] as const).map((lang) => (
              <Link
                key={lang}
                href={`/charte-de-confiance?lang=${lang}`}
                className={`rounded-full px-3 py-1.5 transition ${
                  lang === locale
                    ? "bg-teal-700 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-teal-500"
                }`}
              >
                {CONTENT[lang].languageLabel}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Pratiqo</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
            {content.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{content.subtitle}</p>
          <p className="mt-3 text-xs font-medium text-slate-500">{content.updated}</p>
        </header>

        <section className="mt-8 rounded-2xl border border-teal-500/20 bg-teal-50 p-5">
          <h2 className="text-sm font-bold text-teal-700">{content.examplesTitle}</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <p className="rounded-xl bg-white/80 p-3 text-sm text-slate-700">{content.accepted}</p>
            <p className="rounded-xl bg-white/80 p-3 text-sm text-slate-700">{content.rejected}</p>
          </div>
        </section>

        <article className="mt-10 space-y-6">
          {content.sections.map((section) => (
            <section key={section.title} className="border-t border-slate-200 pt-6">
              <h2 className="text-lg font-bold text-slate-950">{section.title}</h2>
              {section.body ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{section.body}</p> : null}
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 marker:text-teal-700">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </article>

        <footer className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600">
          {content.support}
        </footer>
      </div>
    </main>
  );
}
