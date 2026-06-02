/**
 * YoPremiumModuleShell — shared, server-only renderer for the
 * "Bientôt disponible" / "Coming soon" premium module preview.
 *
 * Why this component exists
 * -------------------------
 * The first premium YoPratiqo module is a content shell, NOT a live
 * paid product. A dedicated shell renderer keeps the "do not pretend
 * to be live" contract centralised:
 *
 *   - No checkout button, no fake price, no fake discount.
 *   - No fake countdown, no fake reviews, no fake ratings.
 *   - Course JSON-LD is intentionally NOT injected (would falsely
 *     signal a live product to crawlers; gated separately in the root
 *     layout's `<YoCourseJsonLdHead />`).
 *   - The route is `noindex` via `buildYoPratiqoMetadata` and excluded
 *     from `app/sitemap.ts`.
 *   - The teacher-bridge CTA points to /trouver-un-prof (the real,
 *     free way to reach a Pratiqo teacher today).
 *
 * The component is a Server Component (no `"use client"`, no hooks,
 * no browser API). It can be safely composed inside any page.tsx
 * without forcing a client boundary.
 *
 * Honest copy contract
 * --------------------
 * The shell never claims:
 *   - guaranteed fluency
 *   - guaranteed exam success (TEF / TEFAQ / TCF / TCFQ / IELTS / …)
 *   - guaranteed employment outcome
 *   - guaranteed immigration result
 *   - government accreditation / OQLF / MIFI partnership
 *
 * The shell always carries the legal-safe disclaimer (rendered via
 * `YoLegalDisclaimer`) so a learner browsing the preview understands
 * the educational nature of the future product.
 */

import Link from "next/link";
import {
  ArrowRightCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  FilePen,
  GraduationCap,
  Layers,
  Lightbulb,
  Lock,
  MapPin,
  Megaphone,
  MessageCircle,
  Quote,
  Sparkles,
  Target,
  Users,
  Wrench,
} from "lucide-react";

import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import { YoBreadcrumb } from "@/components/yo/YoBreadcrumb";
import { YoLegalDisclaimer } from "@/components/yo/YoLegalDisclaimer";
import { YoFrenchAudioButton } from "@/components/yo/YoFrenchAudioButton";
import { YoLocaleSwitcher } from "@/components/yo/YoLocaleSwitcher";
import type { FrQuebecModuleLesson } from "@/lib/yo/frQuebecWorkplaceSurvivalModule";

/**
 * Lesson 1 audio context — passed to every `YoFrenchAudioButton`
 * rendered inside this shell. Centralised so the manifest lookup
 * (moduleId / lessonId / accent profile) stays consistent across
 * the core-phrase list and the mini-dialogue lines, and so a future
 * Lesson 2 / 3 / … only needs its own context object — not new
 * audio plumbing in the renderer.
 *
 * The triple matches the manifest entries declared in
 * `lib/yo/audio/frQuebecPremiumLessonOneAudio.ts`.
 */
const LESSON_ONE_AUDIO_MODULE_ID = "fr-quebec-workplace-survival-1" as const;
const LESSON_ONE_AUDIO_LESSON_ID = "arriver-saluer" as const;
const LESSON_ONE_AUDIO_ACCENT_PROFILE = "quebec_french" as const;
const LESSON_ONE_AUDIO_SPEECH_LANG = "fr-CA" as const;

/**
 * Lesson 2 audio context — passed to every `YoFrenchAudioButton`
 * rendered inside `LessonTwoPreview`. The triple matches the
 * manifest entries declared in
 * `lib/yo/audio/frQuebecPremiumLessonTwoAudio.ts`. Adding a new
 * Quebec French target string in the lesson body + appending the
 * corresponding manifest entry is enough to power its audio button
 * — no UI change required.
 */
const LESSON_TWO_AUDIO_MODULE_ID = "fr-quebec-workplace-survival-1" as const;
const LESSON_TWO_AUDIO_LESSON_ID = "comprendre-consignes-simples" as const;
const LESSON_TWO_AUDIO_ACCENT_PROFILE = "quebec_french" as const;
const LESSON_TWO_AUDIO_SPEECH_LANG = "fr-CA" as const;

/**
 * Lookup: infinitive → tu/vous imperative forms used by the key-verbs
 * grid in `LessonTwoPreview`. The lesson content carries only the
 * infinitive (e.g. `mettre`), but the audio catalogue records each
 * imperative as a separate item (`Mets.` / `Mettez.`) so the learner
 * hears the form they actually need to recognise at work.
 *
 * Keeping this map in the shell (rather than denormalising onto
 * `FrQuebecLessonTwoKeyVerb`) avoids touching the lesson content
 * schema — the audio manifest is a parallel catalogue, not a
 * dependency of the lesson data structure.
 */
const LESSON_TWO_VERB_IMPERATIVES: Record<
  string,
  { tu: string; vous: string }
> = {
  mettre: { tu: "Mets.", vous: "Mettez." },
  prendre: { tu: "Prends.", vous: "Prenez." },
  apporter: { tu: "Apporte.", vous: "Apportez." },
  ranger: { tu: "Range.", vous: "Rangez." },
  ouvrir: { tu: "Ouvre.", vous: "Ouvrez." },
  fermer: { tu: "Ferme.", vous: "Fermez." },
  signer: { tu: "Signe.", vous: "Signez." },
  remplir: { tu: "Remplis.", vous: "Remplissez." },
  vérifier: { tu: "Vérifie.", vous: "Vérifiez." },
  envoyer: { tu: "Envoie.", vous: "Envoyez." },
  imprimer: { tu: "Imprime.", vous: "Imprimez." },
  appeler: { tu: "Appelle.", vous: "Appelez." },
};

export interface YoPremiumModuleShellProps {
  locale: YoLocale;
  /** Display title in FR / EN / ES. */
  titleFr: string;
  titleEn: string;
  titleEs: string;
  /** One-line tagline rendered under the hero title (FR / EN / ES). */
  taglineFr: string;
  taglineEn: string;
  taglineEs: string;
  /** Audience description (FR / EN / ES). */
  audienceFr: string;
  audienceEn: string;
  audienceEs: string;
  /** Honest disclaimer surfaced directly below the audience block (FR / EN / ES). */
  honestPromiseFr: string;
  honestPromiseEn: string;
  honestPromiseEs: string;
  /** Lessons rendered as locked/preview cards. Expected length: 7. */
  lessons: readonly FrQuebecModuleLesson[];
  /** Teacher-bridge title + body (FR / EN / ES, above /trouver-un-prof). */
  teacherBridgeTitleFr: string;
  teacherBridgeTitleEn: string;
  teacherBridgeTitleEs: string;
  teacherBridgeBodyFr: string;
  teacherBridgeBodyEn: string;
  teacherBridgeBodyEs: string;
  /** Coming-soon notice copy rendered near the bottom of the page (FR / EN / ES). */
  comingSoonBodyFr: string;
  comingSoonBodyEn: string;
  comingSoonBodyEs: string;
  /** Breadcrumb labels for the language hub crumb (FR / EN / ES). */
  languageBreadcrumbFr: string;
  languageBreadcrumbEn: string;
  languageBreadcrumbEs: string;
  /** Localized "future module" leaf crumb (FR / EN / ES). */
  futureCrumbFr: string;
  futureCrumbEn: string;
  futureCrumbEs: string;
  /**
   * Path back to the free intro for the same language. Rendered as a
   * primary visible CTA in the hero; the shell never links to a paid
   * destination because no paid surface exists yet.
   */
  introHref: string;
  /** Path to the teacher-search bridge (locale-aware /trouver-un-prof?q=…). */
  teacherBridgeHref: string;
  /**
   * Optional path to the YoPratiqo language hub for the breadcrumb.
   * Defaults to "/yo/langues" when omitted.
   */
  hubHref?: string;
}

const HERO_LABEL = lstr(
  "Module futur YoPratiqo",
  "Future YoPratiqo module",
  "Módulo futuro de YoPratiqo",
);
const COMING_SOON_PILL = lstr(
  "Bientôt disponible",
  "Coming soon",
  "Próximamente",
);
const AUDIENCE_LABEL = lstr("Pour qui", "Who it is for", "Para quién");
const HONEST_PROMISE_LABEL = lstr(
  "Notre engagement honnête",
  "Our honest commitment",
  "Nuestro compromiso honesto",
);
const LESSON_OUTLINE_LABEL = lstr(
  "Plan complet du module",
  "Full module outline",
  "Plan completo del módulo",
);
const LESSON_OUTLINE_TITLE = lstr(
  "Sept courtes leçons, sept situations concrètes",
  "Seven short lessons, seven concrete situations",
  "Siete lecciones breves, siete situaciones concretas",
);
const LESSON_OUTLINE_BODY = lstr(
  "Chaque leçon est une mini-mise en situation : un contexte, trois objectifs et quelques phrases utiles. Les leçons 1 et 2 sont ouvertes en aperçu gratuit ; les cinq autres restent à venir.",
  "Each lesson is a small role-play: a context, three goals, and a few useful phrases. Lessons 1 and 2 are open as free previews; the other five are still upcoming.",
  "Cada lección es una mini-situación: un contexto, tres objetivos y algunas frases útiles. Las lecciones 1 y 2 están abiertas como vistas previas gratuitas; las otras cinco siguen pendientes.",
);
const LESSON_LOCKED_LABEL = lstr(
  "Verrouillé · futur",
  "Locked · upcoming",
  "Bloqueada · próximamente",
);
const LESSON_PREVIEW_LABEL = lstr(
  "Aperçu disponible",
  "Preview available",
  "Vista previa disponible",
);
const LESSON_GOALS_LABEL = lstr(
  "Objectifs",
  "Learning goals",
  "Objetivos",
);
const LESSON_BRIDGE_LABEL = lstr(
  "Avec un professeur",
  "With a teacher",
  "Con un profesor",
);

const PREVIEW_EYEBROW = lstr(
  "Aperçu gratuit · Leçon 1",
  "Free preview · Lesson 1",
  "Vista previa gratuita · Lección 1",
);
const PREVIEW_OBJECTIVE_LABEL = lstr("Objectif", "Objective", "Objetivo");
const PREVIEW_SCENARIO_LABEL = lstr(
  "Mise en situation",
  "Scenario",
  "Situación",
);
const PREVIEW_CULTURE_LABEL = lstr(
  "Note culturelle",
  "Cultural note",
  "Nota cultural",
);
const PREVIEW_PHRASES_LABEL = lstr(
  "Phrases-clés",
  "Core phrases",
  "Frases clave",
);
const PREVIEW_DIALOGUES_LABEL = lstr(
  "Mini-dialogues",
  "Mini-dialogues",
  "Mini-diálogos",
);
const PREVIEW_TUVOUS_LABEL = lstr(
  "Tu ou vous ?",
  "Tu or vous?",
  "¿« Tu » o « vous »?",
);
const PREVIEW_QUIZ_LABEL = lstr(
  "Petit quiz",
  "Quick quiz",
  "Mini-cuestionario",
);
const PREVIEW_REFLECTION_LABEL = lstr(
  "Réflexion",
  "Reflection",
  "Reflexión",
);
const PREVIEW_BRIDGE_LABEL = lstr(
  "Avec un professeur",
  "With a teacher",
  "Con un profesor",
);

// ─── Lesson 2 — section labels (eyebrows + headings) ─────────────────
//
// Mirror the Lesson 1 eyebrow/heading constants so the renderer can
// keep its localized-by-default contract: every label flows through
// `t(label, locale)`, never a bare FR or EN literal. Adding a Lesson 3
// later just requires another set of constants beside this block.
const PREVIEW_LESSON2_EYEBROW = lstr(
  "Aperçu gratuit · Leçon 2",
  "Free preview · Lesson 2",
  "Vista previa gratuita · Lección 2",
);
const PREVIEW_BEFORE_LABEL = lstr(
  "Avant de commencer",
  "Before you start",
  "Antes de comenzar",
);
const PREVIEW_MICROSKILLS_LABEL = lstr(
  "Trois micro-compétences",
  "Three micro-skills",
  "Tres micro-competencias",
);
const PREVIEW_VERBS_LABEL = lstr(
  "Verbes-clés du travail",
  "Key workplace verbs",
  "Verbos clave del trabajo",
);
const PREVIEW_VERBS_PHYSICAL_LABEL = lstr(
  "Actions physiques",
  "Physical actions",
  "Acciones físicas",
);
const PREVIEW_VERBS_ADMIN_LABEL = lstr(
  "Actions administratives",
  "Administrative actions",
  "Acciones administrativas",
);
const PREVIEW_MARKERS_LABEL = lstr(
  "Marqueurs oraux du Québec",
  "Quebec oral markers",
  "Marcadores orales de Quebec",
);
const PREVIEW_CONFIRM_LABEL = lstr(
  "Formules de confirmation",
  "Confirmation formulas",
  "Fórmulas de confirmación",
);
const PREVIEW_REFORMULATE_LABEL = lstr(
  "Formules de reformulation",
  "Reformulation formulas",
  "Fórmulas de reformulación",
);
const PREVIEW_SCENARIO_FULL_LABEL = lstr(
  "Mini-scénario complet",
  "Complete mini-scenario",
  "Mini-escenario completo",
);
const PREVIEW_FLASHCARDS_LABEL = lstr(
  "Fiches mémo",
  "Flashcards",
  "Tarjetas de memoria",
);
const PREVIEW_TEACHER_CTA_LABEL = lstr(
  "Pratiquer avec un professeur",
  "Practice with a teacher",
  "Practicar con un profesor",
);
const PREVIEW_NEXT_LESSON_LABEL = lstr(
  "Suite du module",
  "Coming next",
  "Próxima lección",
);
const VERB_EXAMPLE_HINT_LABEL = lstr(
  "Exemple : ",
  "Example: ",
  "Ejemplo: ",
);
const FLASHCARD_HINT_LABEL = lstr("Astuce : ", "Hint: ", "Pista: ");
const FORMULA_REGISTER_HINT_PREFIX = lstr(
  "Registre : ",
  "Register: ",
  "Registro: ",
);

const REGISTER_LABELS: Record<
  "informal" | "neutral" | "formal",
  YoLocalizedString
> = {
  informal: lstr("Familier", "Informal", "Informal"),
  neutral: lstr("Neutre", "Neutral", "Neutro"),
  formal: lstr("Soutenu", "Formal", "Formal"),
};

const TUVOUS_BADGE_LABELS: Record<
  "tu" | "vous" | "follow",
  YoLocalizedString
> = {
  tu: lstr(
    "Choix sûr · « tu »",
    "Safest · « tu »",
    "Más seguro · « tu »",
  ),
  vous: lstr(
    "Choix sûr · « vous »",
    "Safest · « vous »",
    "Más seguro · « vous »",
  ),
  follow: lstr(
    "Choix sûr · suivez la personne",
    "Safest · follow the other person",
    "Más seguro · imite el trato de la otra persona",
  ),
};

const QUIZ_ANSWER_LABEL = lstr("Réponse", "Answer", "Respuesta");
const QUIZ_EXPLANATION_LABEL = lstr("Pourquoi", "Why", "Por qué");

const REFLECTION_HELP = lstr(
  "Cette question est uniquement pour vous — rien n’est transmis ni partagé.",
  "This question is just for you — nothing is sent or shared.",
  "Esta pregunta es solo para usted — no se transmite ni se comparte nada.",
);

const PREVIEW_TEACHER_NOTE = lstr(
  "Pratiquez ce scénario à voix haute avec un professeur Pratiqo lorsque vous serez prêt — vous choisissez quand et avec qui.",
  "Practice this scenario out loud with a Pratiqo teacher when you’re ready — you decide when and with whom.",
  "Practique este escenario en voz alta con un profesor de Pratiqo cuando se sienta listo — usted elige cuándo y con quién.",
);

const TEACHER_BRIDGE_LABEL = lstr(
  "Pont vers un professeur",
  "Teacher bridge",
  "Puente hacia un profesor",
);
const TEACHER_BRIDGE_CTA = lstr(
  "Trouver un professeur sur Pratiqo",
  "Find a teacher on Pratiqo",
  "Encontrar un profesor en Pratiqo",
);

const RETURN_INTRO_CTA = lstr(
  "Retour à l’intro gratuite",
  "Back to the free intro",
  "Volver a la intro gratuita",
);
const FIND_TEACHER_CTA = lstr(
  "Trouver un professeur",
  "Find a teacher",
  "Encontrar un profesor",
);

const COMING_SOON_LABEL = lstr(
  "À propos de ce module",
  "About this module",
  "Acerca de este módulo",
);
const COMING_SOON_TITLE = lstr(
  "Aperçu d’un futur module YoPratiqo",
  "Preview of a future YoPratiqo module",
  "Vista previa de un futuro módulo de YoPratiqo",
);
const NO_CHECKOUT_PILL = lstr(
  "Achat indisponible pour le moment",
  "Purchase not available yet",
  "Compra todavía no disponible",
);
const NO_PAID_ACCESS_PILL = lstr(
  "Accès payant non activé",
  "Paid access not active",
  "Acceso de pago no activo",
);
const NO_PRICE_PILL = lstr(
  "Aucun prix en vigueur",
  "No live pricing in effect",
  "Sin precio vigente",
);

/**
 * Audience section eyebrow title rendered above the audience body.
 * Trilingual so the ES learner doesn't see an English fallback when
 * they switched their UI to ES.
 */
const AUDIENCE_TITLE = lstr(
  "Pensé pour les apprenants déjà au Québec ou en route",
  "Built for learners already in Quebec — or on their way",
  "Pensado para personas que ya están en Quebec — o en camino",
);

const LESSON_NUMBER_LABEL = lstr("Leçon", "Lesson", "Lección");
const SITUATION_NUMBER_LABEL = lstr(
  "Situation",
  "Situation",
  "Situación",
);
const QUESTION_NUMBER_LABEL = lstr(
  "Question",
  "Question",
  "Pregunta",
);
const QUIZ_TAGLINE = lstr(
  "Cinq questions courtes — pas de note, pas de chronomètre. Pour vous, à votre rythme.",
  "Five short questions — no score, no timer. For you, at your own pace.",
  "Cinco preguntas breves — sin puntuación ni cronómetro. Para usted, a su ritmo.",
);
const PREVIEW_BROWSE_TEACHERS_CTA = lstr(
  "Voir les professeurs Pratiqo",
  "Browse Pratiqo teachers",
  "Ver los profesores de Pratiqo",
);
const STANDARD_FRENCH_LABEL = lstr(
  "Standard : ",
  "Standard French: ",
  "Francés estándar: ",
);
const PHRASE_WHEN_LABEL = lstr("Quand : ", "When: ", "Cuándo: ");
const LEGAL_NOTICE_ARIA = lstr(
  "Avis légal éducatif",
  "Educational legal notice",
  "Aviso legal educativo",
);

function formatMinutes(minutes: number, locale: YoLocale): string {
  if (locale === "es") return `≈ ${minutes} min`;
  return locale === "fr" ? `≈ ${minutes} min` : `≈ ${minutes} min`;
}

/**
 * Pick the right field by locale, falling back to FR when the
 * requested locale's value is empty/undefined. Mirrors the contract
 * of `t()` but for parallel sibling fields (e.g. `titleFr` /
 * `titleEn` / `titleEs`) instead of a single `YoLocalizedString`.
 */
function pickLocaleField(
  locale: YoLocale,
  fr: string,
  en: string,
  es?: string,
): string {
  if (locale === "es") return es && es.length > 0 ? es : fr;
  if (locale === "en") return en && en.length > 0 ? en : fr;
  return fr;
}

/**
 * Rich free-preview body for the first lesson tagged
 * `status: "preview"`. Renders the 9 documented sections (objective,
 * scenario, cultural note, core phrases, mini-dialogues, tu/vous
 * practice, quick quiz, reflection prompt, teacher-bridge prompt).
 *
 * Important UI invariants:
 *   - No `"use client"`. Everything is server-rendered.
 *   - No form, no input, no audio, no recording UI. The reflection
 *     prompt is shown as plain prose only.
 *   - The quiz answer + explanation are rendered statically inside
 *     a `<details>` so the learner can self-check without JS — no
 *     scoring, no progress tracking, no submission.
 *   - The teacher-bridge prompt links to /trouver-un-prof and never
 *     mentions automatic teacher routing or data sharing.
 */
function LessonOnePreview({
  locale,
  lesson,
  teacherBridgeHref,
}: {
  locale: YoLocale;
  lesson: FrQuebecModuleLesson;
  teacherBridgeHref: string;
}) {
  // Narrow on `content.kind` so this renderer only runs against
  // Lesson 1's content shape. The shell-level dispatch already picks
  // the right preview component, so this guard is belt-and-suspenders.
  const content = lesson.content;
  if (!content || content.kind !== "lesson1") return null;

  const lessonTitle = pickLocaleField(
    locale,
    lesson.titleFr,
    lesson.titleEn,
    lesson.titleEs,
  );
  const objective = pickLocaleField(
    locale,
    content.objectiveFr,
    content.objectiveEn,
    content.objectiveEs,
  );
  const scenario = pickLocaleField(
    locale,
    content.scenarioFr,
    content.scenarioEn,
    content.scenarioEs,
  );
  const cultural = pickLocaleField(
    locale,
    content.culturalNoteFr,
    content.culturalNoteEn,
    content.culturalNoteEs,
  );
  const reflection = pickLocaleField(
    locale,
    content.reflectionPromptFr,
    content.reflectionPromptEn,
    content.reflectionPromptEs,
  );
  const bridgePrompt = pickLocaleField(
    locale,
    content.teacherBridgePromptFr,
    content.teacherBridgePromptEn,
    content.teacherBridgePromptEs,
  );

  return (
    <section
      aria-labelledby="yo-fr-qc-mod1-lesson1-title"
      id="lecon-1"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="rounded-3xl border border-[#0F6E56]/15 bg-white p-5 shadow-[0_8px_24px_rgba(15,58,52,0.05)] sm:p-7">
        {/* Lesson eyebrow + title */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1D9E75]/35 bg-[#DDF4F1]/60 px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]">
            <Sparkles className="size-3.5 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_EYEBROW, locale)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F6E56]/8 px-3 py-1 text-[0.7rem] font-bold text-[#0F6E56]/80">
            <Clock className="size-3.5" aria-hidden />
            {formatMinutes(lesson.estimatedMinutes, locale)}
          </span>
        </div>
        <h2
          id="yo-fr-qc-mod1-lesson1-title"
          className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-[1.85rem]"
        >
          {lessonTitle}
        </h2>

        {/* 1. Objective */}
        <section
          aria-label={t(PREVIEW_OBJECTIVE_LABEL, locale)}
          className="mt-6 rounded-2xl border border-[#DDF4F1] bg-[#F4FBF9] p-4 sm:p-5"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <Target className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_OBJECTIVE_LABEL, locale)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-[0.95rem]">
            {objective}
          </p>
        </section>

        {/* 2. Scenario */}
        <section
          aria-label={t(PREVIEW_SCENARIO_LABEL, locale)}
          className="mt-5 rounded-2xl border border-teal-100 bg-white p-4 sm:p-5"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <MapPin className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_SCENARIO_LABEL, locale)}
          </p>
          <p
            className="mt-2 text-sm leading-relaxed text-[#0F6E56]/85"
            lang={
              locale === "es" ? "es" : locale === "en" ? "en" : undefined
            }
          >
            {scenario}
          </p>
        </section>

        {/* 3. Cultural note */}
        <section
          aria-label={t(PREVIEW_CULTURE_LABEL, locale)}
          className="mt-5 rounded-2xl border border-[#F4B400]/30 bg-[#FFF8E1]/80 p-4 sm:p-5"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
            <Lightbulb className="size-4 text-[#8a5a17]" aria-hidden />
            {t(PREVIEW_CULTURE_LABEL, locale)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#5a3f0f]">
            {cultural}
          </p>
        </section>

        {/* 4. Core phrases */}
        <section
          aria-label={t(PREVIEW_PHRASES_LABEL, locale)}
          className="mt-7"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <BookOpen className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_PHRASES_LABEL, locale)}
          </p>
          <ul
            role="list"
            className="mt-3 grid gap-3 sm:grid-cols-2"
          >
            {content.corePhrases.map((phrase) => (
              <li
                key={phrase.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-1 items-start gap-2">
                    <p
                      className="text-base font-semibold leading-snug text-[#0F6E56]"
                      lang="fr-CA"
                    >
                      {phrase.frQuebec}
                    </p>
                    <YoFrenchAudioButton
                      text={phrase.frQuebec}
                      locale={locale}
                      moduleId={LESSON_ONE_AUDIO_MODULE_ID}
                      lessonId={LESSON_ONE_AUDIO_LESSON_ID}
                      accentProfile={LESSON_ONE_AUDIO_ACCENT_PROFILE}
                      speechLang={LESSON_ONE_AUDIO_SPEECH_LANG}
                      size="xs"
                    />
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-[#DDF4F1]/70 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                    {t(REGISTER_LABELS[phrase.register], locale)}
                  </span>
                </div>
                {phrase.standardFrench ? (
                  <p
                    className="mt-1 text-xs italic text-[#0F6E56]/65"
                    lang="fr"
                  >
                    {t(STANDARD_FRENCH_LABEL, locale)}
                    {phrase.standardFrench}
                  </p>
                ) : null}
                <p
                  className={
                    locale === "es"
                      ? "mt-2 text-sm leading-relaxed text-[#0F6E56]/85"
                      : "mt-2 text-sm leading-relaxed text-[#0F6E56]/85"
                  }
                  lang={locale === "es" ? "es" : "en"}
                >
                  {locale === "es" && phrase.spanish
                    ? phrase.spanish
                    : phrase.english}
                </p>
                {locale === "es" && phrase.spanish ? (
                  <p
                    className="mt-1 text-xs italic text-[#0F6E56]/55"
                    lang="en"
                  >
                    {phrase.english}
                  </p>
                ) : null}
                <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/70">
                  <span className="font-semibold text-[#0F6E56]/75">
                    {t(PHRASE_WHEN_LABEL, locale)}
                  </span>
                  {pickLocaleField(
                    locale,
                    phrase.usageFr,
                    phrase.usageEn,
                    phrase.usageEs,
                  )}
                </p>
                {pickLocaleField(
                  locale,
                  phrase.noteFr ?? "",
                  phrase.noteEn ?? "",
                  phrase.noteEs,
                ) ? (
                  <p className="mt-2 rounded-lg bg-[#FFF4D6]/60 px-3 py-2 text-xs leading-relaxed text-[#5a3f0f]">
                    {pickLocaleField(
                      locale,
                      phrase.noteFr ?? "",
                      phrase.noteEn ?? "",
                      phrase.noteEs,
                    )}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* 5. Mini-dialogues */}
        <section
          aria-label={t(PREVIEW_DIALOGUES_LABEL, locale)}
          className="mt-7"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <Users className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_DIALOGUES_LABEL, locale)}
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            {content.miniDialogues.map((dialogue) => (
              <article
                key={dialogue.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <h3 className="text-sm font-bold tracking-tight text-[#0F6E56]">
                  {pickLocaleField(
                    locale,
                    dialogue.titleFr,
                    dialogue.titleEn,
                    dialogue.titleEs,
                  )}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/65">
                  {pickLocaleField(
                    locale,
                    dialogue.contextFr,
                    dialogue.contextEn,
                    dialogue.contextEs,
                  )}
                </p>
                <ol
                  role="list"
                  className="mt-3 space-y-2 text-sm leading-relaxed"
                >
                  {dialogue.lines.map((line, lineIndex) => (
                    <li
                      key={`${dialogue.id}-${lineIndex}`}
                      className="rounded-xl bg-[#F4FBF9] px-3 py-2"
                    >
                      <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#1D9E75]">
                        {pickLocaleField(
                          locale,
                          line.speakerFr,
                          line.speakerEn,
                          line.speakerEs,
                        )}
                      </p>
                      <div className="mt-1 flex flex-wrap items-start gap-2">
                        <p
                          className="font-medium text-[#0F6E56]"
                          lang="fr-CA"
                        >
                          {line.frQuebec}
                        </p>
                        <YoFrenchAudioButton
                          text={line.frQuebec}
                          locale={locale}
                          moduleId={LESSON_ONE_AUDIO_MODULE_ID}
                          lessonId={LESSON_ONE_AUDIO_LESSON_ID}
                          accentProfile={LESSON_ONE_AUDIO_ACCENT_PROFILE}
                          speechLang={LESSON_ONE_AUDIO_SPEECH_LANG}
                          size="xs"
                        />
                      </div>
                      <p
                        className="mt-1 text-xs text-[#0F6E56]/70"
                        lang={locale === "es" ? "es" : "en"}
                      >
                        {locale === "es" && line.spanish
                          ? line.spanish
                          : line.english}
                      </p>
                      {pickLocaleField(
                        locale,
                        line.noteFr ?? "",
                        line.noteEn ?? "",
                        line.noteEs,
                      ) ? (
                        <p className="mt-2 text-[0.7rem] leading-relaxed text-[#0F6E56]/55">
                          {pickLocaleField(
                            locale,
                            line.noteFr ?? "",
                            line.noteEn ?? "",
                            line.noteEs,
                          )}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>

        {/* 6. Tu vs vous practice */}
        <section
          aria-label={t(PREVIEW_TUVOUS_LABEL, locale)}
          className="mt-7"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <Users className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_TUVOUS_LABEL, locale)}
          </p>
          <ol role="list" className="mt-3 grid gap-3 sm:grid-cols-2">
            {content.tuVousPractice.map((situation, situationIndex) => (
              <li
                key={situation.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                  {`${t(SITUATION_NUMBER_LABEL, locale)} ${situationIndex + 1}`}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#0F6E56]/85">
                  {pickLocaleField(
                    locale,
                    situation.situationFr,
                    situation.situationEn,
                    situation.situationEs,
                  )}
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#DDF4F1]/70 px-3 py-1 text-xs font-bold text-[#0F6E56]">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  {t(TUVOUS_BADGE_LABELS[situation.safestChoice], locale)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/70">
                  {pickLocaleField(
                    locale,
                    situation.explanationFr,
                    situation.explanationEn,
                    situation.explanationEs,
                  )}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* 7. Quick quiz */}
        <section
          aria-label={t(PREVIEW_QUIZ_LABEL, locale)}
          className="mt-7"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <Sparkles className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_QUIZ_LABEL, locale)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/60">
            {t(QUIZ_TAGLINE, locale)}
          </p>
          <ol role="list" className="mt-3 space-y-3">
            {content.quizQuestions.map((question, questionIndex) => {
              const correct = question.options.find(
                (opt) => opt.id === question.correctOptionId,
              );
              return (
                <li
                  key={question.id}
                  className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
                >
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                    {`${t(QUESTION_NUMBER_LABEL, locale)} ${questionIndex + 1}`}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#0F6E56]">
                    {pickLocaleField(
                      locale,
                      question.promptFr,
                      question.promptEn,
                      question.promptEs,
                    )}
                  </p>
                  <ul role="list" className="mt-2 space-y-1.5 text-sm">
                    {question.options.map((option) => {
                      // Trilingual contract: the Quebec French target
                      // phrase ALWAYS renders prominently. The EN/ES
                      // gloss is a small helper line shown only when
                      // the active locale matches and a gloss exists
                      // — it's a translation/explanation, never a
                      // replacement for the French target.
                      const optionGloss =
                        locale === "en"
                          ? option.glossEn
                          : locale === "es"
                            ? option.glossEs
                            : undefined;
                      return (
                        <li
                          key={option.id}
                          className="flex items-start gap-2 rounded-xl bg-[#F4FBF9]/70 px-3 py-2"
                        >
                          <span
                            aria-hidden
                            className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-[#1D9E75]"
                          />
                          <div className="flex-1">
                            <p
                              className="font-medium text-[#0F6E56]"
                              lang="fr-CA"
                            >
                              {option.targetFr}
                            </p>
                            {optionGloss && optionGloss.length > 0 ? (
                              <p
                                className="mt-1 text-xs text-[#0F6E56]/65"
                                lang={locale === "es" ? "es" : "en"}
                              >
                                {optionGloss}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {correct ? (
                    (() => {
                      const correctGloss =
                        locale === "en"
                          ? correct.glossEn
                          : locale === "es"
                            ? correct.glossEs
                            : undefined;
                      return (
                        <details className="mt-3 rounded-xl bg-[#DDF4F1]/40 px-3 py-2 text-xs leading-relaxed text-[#0F6E56]/80">
                          <summary className="cursor-pointer font-bold text-[#0F6E56]">
                            {t(QUIZ_ANSWER_LABEL, locale)}
                          </summary>
                          <p
                            className="mt-2 font-medium text-[#0F6E56]"
                            lang="fr-CA"
                          >
                            {correct.targetFr}
                          </p>
                          {correctGloss && correctGloss.length > 0 ? (
                            <p
                              className="mt-1 text-xs text-[#0F6E56]/65"
                              lang={locale === "es" ? "es" : "en"}
                            >
                              {correctGloss}
                            </p>
                          ) : null}
                          <p className="mt-2">
                            <span className="font-semibold text-[#0F6E56]">
                              {t(QUIZ_EXPLANATION_LABEL, locale)} :{" "}
                            </span>
                            {pickLocaleField(
                              locale,
                              question.explanationFr,
                              question.explanationEn,
                              question.explanationEs,
                            )}
                          </p>
                        </details>
                      );
                    })()
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>

        {/* 8. Reflection prompt */}
        <section
          aria-label={t(PREVIEW_REFLECTION_LABEL, locale)}
          className="mt-7 rounded-2xl border border-[#0F6E56]/12 bg-[#0F6E56]/5 p-4 sm:p-5"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <Lightbulb className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_REFLECTION_LABEL, locale)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-[0.95rem]">
            {reflection}
          </p>
          <p className="mt-2 text-[0.7rem] leading-relaxed text-[#0F6E56]/55">
            {t(REFLECTION_HELP, locale)}
          </p>
        </section>

        {/* 9. Teacher bridge prompt (consent-safe) */}
        <section
          aria-label={t(PREVIEW_BRIDGE_LABEL, locale)}
          className="mt-7 rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6]/70 p-4 sm:p-5"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
            <GraduationCap className="size-4 text-[#0F6E56]" aria-hidden />
            {t(PREVIEW_BRIDGE_LABEL, locale)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#5a3f0f]">
            {bridgePrompt}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[#5a3f0f]/80">
            {t(PREVIEW_TEACHER_NOTE, locale)}
          </p>
          <Link
            href={teacherBridgeHref}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(15,110,86,0.18)] transition hover:bg-[#0b5b47]"
          >
            <MessageCircle className="size-4" aria-hidden />
            {t(PREVIEW_BROWSE_TEACHERS_CTA, locale)}
          </Link>
        </section>
      </div>
    </section>
  );
}

/**
 * Rich free-preview body for the second lesson tagged
 * `status: "preview"`. Renders the 11 documented sections of Lesson 2
 * ("Comprendre les consignes simples") — before-you-start framing,
 * three micro-skills, twelve key verbs (split physical /
 * administrative), four Quebec oral markers, five confirmation
 * formulas, five reformulation formulas, one mini-scenario, five
 * quiz questions, eight-to-twelve flashcards, the consent-safe
 * teacher CTA, and the next-lesson teaser.
 *
 * Important invariants (mirrors LessonOnePreview):
 *   - No `"use client"`. Pure server render.
 *   - No form / input / audio playback / recording. The flashcards
 *     show front + back side-by-side because we don't have client JS
 *     to "flip" the card; learners self-check by reading.
 *   - The teacher CTA links to /trouver-un-prof (the real, free way
 *     to reach a Pratiqo teacher) and never mentions automatic
 *     teacher routing or data sharing.
 *   - `YoFrenchAudioButton` IS rendered next to Lesson 2 Quebec
 *     French target strings (oral markers, imperative verb forms,
 *     per-verb examples, confirmation formulas, reformulation
 *     formulas, mini-scenario lines). Bindings only touch the
 *     French side of each row — never the EN / ES gloss. When a
 *     manifest entry exists, the inner `YoAudioPlayer` resolves it
 *     to the pre-generated MP3; otherwise the button falls through
 *     to the Web-Speech fallback so the lesson never breaks while
 *     the audio catalogue grows.
 */
function LessonTwoPreview({
  locale,
  lesson,
  teacherBridgeHref,
}: {
  locale: YoLocale;
  lesson: FrQuebecModuleLesson;
  teacherBridgeHref: string;
}) {
  const content = lesson.content;
  if (!content || content.kind !== "lesson2") return null;

  const lessonTitle = pickLocaleField(
    locale,
    lesson.titleFr,
    lesson.titleEn,
    lesson.titleEs,
  );
  const beforeYouStart = pickLocaleField(
    locale,
    content.beforeYouStartFr,
    content.beforeYouStartEn,
    content.beforeYouStartEs,
  );
  const teacherCta = pickLocaleField(
    locale,
    content.teacherCta.promptFr,
    content.teacherCta.promptEn,
    content.teacherCta.promptEs,
  );
  const nextTeaser = pickLocaleField(
    locale,
    content.nextLessonTeaser.teaserFr,
    content.nextLessonTeaser.teaserEn,
    content.nextLessonTeaser.teaserEs,
  );

  const physicalVerbs = content.keyVerbs.filter(
    (v) => v.category === "physical",
  );
  const administrativeVerbs = content.keyVerbs.filter(
    (v) => v.category === "administrative",
  );

  return (
    <section
      aria-labelledby="yo-fr-qc-mod1-lesson2-title"
      id="lecon-2"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="rounded-3xl border border-[#0F6E56]/15 bg-white p-5 shadow-[0_8px_24px_rgba(15,58,52,0.05)] sm:p-7">
        {/* Lesson eyebrow + title */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1D9E75]/35 bg-[#DDF4F1]/60 px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]">
            <Sparkles className="size-3.5 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_LESSON2_EYEBROW, locale)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0F6E56]/8 px-3 py-1 text-[0.7rem] font-bold text-[#0F6E56]/80">
            <Clock className="size-3.5" aria-hidden />
            {formatMinutes(lesson.estimatedMinutes, locale)}
          </span>
        </div>
        <h2
          id="yo-fr-qc-mod1-lesson2-title"
          className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-[1.85rem]"
        >
          {lessonTitle}
        </h2>

        {/* 1. Before-you-start framing */}
        <section
          aria-label={t(PREVIEW_BEFORE_LABEL, locale)}
          className="mt-6 rounded-2xl border border-[#DDF4F1] bg-[#F4FBF9] p-4 sm:p-5"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <Lightbulb className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_BEFORE_LABEL, locale)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-[0.95rem]">
            {beforeYouStart}
          </p>
        </section>

        {/* 2. Three micro-skills */}
        <section
          aria-label={t(PREVIEW_MICROSKILLS_LABEL, locale)}
          className="mt-7"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <Target className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_MICROSKILLS_LABEL, locale)}
          </p>
          <ul
            role="list"
            className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {content.microSkills.map((skill) => (
              <li
                key={skill.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p className="text-sm font-semibold text-[#0F6E56]">
                  {pickLocaleField(
                    locale,
                    skill.labelFr,
                    skill.labelEn,
                    skill.labelEs,
                  )}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/70">
                  {pickLocaleField(
                    locale,
                    skill.hintFr,
                    skill.hintEn,
                    skill.hintEs,
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* 3. Key verbs — physical + administrative subsections */}
        <section
          aria-label={t(PREVIEW_VERBS_LABEL, locale)}
          className="mt-7"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <BookOpen className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_VERBS_LABEL, locale)}
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {(
              [
                {
                  label: PREVIEW_VERBS_PHYSICAL_LABEL,
                  icon: Wrench,
                  list: physicalVerbs,
                },
                {
                  label: PREVIEW_VERBS_ADMIN_LABEL,
                  icon: FilePen,
                  list: administrativeVerbs,
                },
              ] as const
            ).map((group) => {
              const Icon = group.icon;
              return (
                <div
                  key={group.label.fr}
                  className="rounded-2xl border border-teal-100 bg-[#F4FBF9]/50 p-4"
                >
                  <p className="flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#1D9E75]">
                    <Icon className="size-3.5" aria-hidden />
                    {t(group.label, locale)}
                  </p>
                  <ul
                    role="list"
                    className="mt-3 space-y-2.5"
                  >
                    {group.list.map((verb) => {
                      const gloss =
                        locale === "es" ? verb.glossEs : verb.glossEn;
                      const exampleGloss =
                        locale === "es"
                          ? verb.exampleGlossEs
                          : verb.exampleGlossEn;
                      const imperatives =
                        LESSON_TWO_VERB_IMPERATIVES[verb.infinitive];
                      return (
                        <li
                          key={verb.id}
                          className="rounded-xl bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
                        >
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <p
                              className="text-base font-semibold text-[#0F6E56]"
                              lang="fr-CA"
                            >
                              {verb.infinitive}
                            </p>
                            {imperatives ? (
                              <span className="inline-flex items-center gap-1">
                                <YoFrenchAudioButton
                                  text={imperatives.tu}
                                  locale={locale}
                                  moduleId={LESSON_TWO_AUDIO_MODULE_ID}
                                  lessonId={LESSON_TWO_AUDIO_LESSON_ID}
                                  accentProfile={
                                    LESSON_TWO_AUDIO_ACCENT_PROFILE
                                  }
                                  speechLang={LESSON_TWO_AUDIO_SPEECH_LANG}
                                  size="xs"
                                />
                                <YoFrenchAudioButton
                                  text={imperatives.vous}
                                  locale={locale}
                                  moduleId={LESSON_TWO_AUDIO_MODULE_ID}
                                  lessonId={LESSON_TWO_AUDIO_LESSON_ID}
                                  accentProfile={
                                    LESSON_TWO_AUDIO_ACCENT_PROFILE
                                  }
                                  speechLang={LESSON_TWO_AUDIO_SPEECH_LANG}
                                  size="xs"
                                />
                              </span>
                            ) : null}
                            {locale !== "fr" ? (
                              <p
                                className="text-xs italic text-[#0F6E56]/60"
                                lang={locale === "es" ? "es" : "en"}
                              >
                                — {gloss}
                              </p>
                            ) : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-start gap-2">
                            <p
                              className="text-sm text-[#0F6E56]/85"
                              lang="fr-CA"
                            >
                              <span className="font-semibold text-[#0F6E56]/60">
                                {t(VERB_EXAMPLE_HINT_LABEL, locale)}
                              </span>
                              {verb.exampleFr}
                            </p>
                            <YoFrenchAudioButton
                              text={verb.exampleFr}
                              locale={locale}
                              moduleId={LESSON_TWO_AUDIO_MODULE_ID}
                              lessonId={LESSON_TWO_AUDIO_LESSON_ID}
                              accentProfile={LESSON_TWO_AUDIO_ACCENT_PROFILE}
                              speechLang={LESSON_TWO_AUDIO_SPEECH_LANG}
                              size="xs"
                            />
                          </div>
                          {locale !== "fr" ? (
                            <p
                              className="mt-0.5 text-xs italic text-[#0F6E56]/55"
                              lang={locale === "es" ? "es" : "en"}
                            >
                              {exampleGloss}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Quebec oral markers */}
        <section
          aria-label={t(PREVIEW_MARKERS_LABEL, locale)}
          className="mt-7"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <Megaphone className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_MARKERS_LABEL, locale)}
          </p>
          <ul
            role="list"
            className="mt-3 grid gap-3 sm:grid-cols-2"
          >
            {content.oralMarkers.map((marker) => (
              <li
                key={marker.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className="text-base font-semibold text-[#0F6E56]"
                    lang="fr-CA"
                  >
                    {marker.marker}
                  </p>
                  <YoFrenchAudioButton
                    text={marker.marker}
                    locale={locale}
                    moduleId={LESSON_TWO_AUDIO_MODULE_ID}
                    lessonId={LESSON_TWO_AUDIO_LESSON_ID}
                    accentProfile={LESSON_TWO_AUDIO_ACCENT_PROFILE}
                    speechLang={LESSON_TWO_AUDIO_SPEECH_LANG}
                    size="xs"
                  />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80">
                  {pickLocaleField(
                    locale,
                    marker.meaningFr,
                    marker.meaningEn,
                    marker.meaningEs,
                  )}
                </p>
                <p
                  className="mt-2 rounded-xl bg-[#F4FBF9]/70 px-3 py-2 text-sm leading-relaxed text-[#0F6E56]"
                  lang="fr-CA"
                >
                  {marker.exampleFr}
                </p>
                {locale !== "fr" ? (
                  <p
                    className="mt-1 text-xs italic text-[#0F6E56]/60"
                    lang={locale === "es" ? "es" : "en"}
                  >
                    {locale === "es"
                      ? marker.exampleGlossEs
                      : marker.exampleGlossEn}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* 5. Confirmation formulas */}
        <section
          aria-label={t(PREVIEW_CONFIRM_LABEL, locale)}
          className="mt-7"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <CheckCircle2 className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_CONFIRM_LABEL, locale)}
          </p>
          <ul
            role="list"
            className="mt-3 grid gap-3 sm:grid-cols-2"
          >
            {content.confirmationFormulas.map((formula) => {
              const register = pickLocaleField(
                locale,
                formula.registerFr,
                formula.registerEn,
                formula.registerEs,
              );
              const gloss =
                locale === "es"
                  ? formula.glossEs
                  : locale === "en"
                    ? formula.glossEn
                    : undefined;
              return (
                <li
                  key={formula.id}
                  className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className="text-base font-semibold text-[#0F6E56]"
                      lang="fr-CA"
                    >
                      {formula.targetFr}
                    </p>
                    <YoFrenchAudioButton
                      text={formula.targetFr}
                      locale={locale}
                      moduleId={LESSON_TWO_AUDIO_MODULE_ID}
                      lessonId={LESSON_TWO_AUDIO_LESSON_ID}
                      accentProfile={LESSON_TWO_AUDIO_ACCENT_PROFILE}
                      speechLang={LESSON_TWO_AUDIO_SPEECH_LANG}
                      size="xs"
                    />
                  </div>
                  {gloss ? (
                    <p
                      className="mt-1 text-xs italic text-[#0F6E56]/60"
                      lang={locale === "es" ? "es" : "en"}
                    >
                      {gloss}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[#1D9E75]">
                    {t(FORMULA_REGISTER_HINT_PREFIX, locale)}
                    {register}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 6. Reformulation formulas */}
        <section
          aria-label={t(PREVIEW_REFORMULATE_LABEL, locale)}
          className="mt-7"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <Quote className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_REFORMULATE_LABEL, locale)}
          </p>
          <ul
            role="list"
            className="mt-3 grid gap-3 sm:grid-cols-2"
          >
            {content.reformulationFormulas.map((formula) => {
              const register = pickLocaleField(
                locale,
                formula.registerFr,
                formula.registerEn,
                formula.registerEs,
              );
              const gloss =
                locale === "es"
                  ? formula.glossEs
                  : locale === "en"
                    ? formula.glossEn
                    : undefined;
              return (
                <li
                  key={formula.id}
                  className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <p
                      className="text-base font-semibold text-[#0F6E56]"
                      lang="fr-CA"
                    >
                      {formula.targetFr}
                    </p>
                    <YoFrenchAudioButton
                      text={formula.targetFr}
                      locale={locale}
                      moduleId={LESSON_TWO_AUDIO_MODULE_ID}
                      lessonId={LESSON_TWO_AUDIO_LESSON_ID}
                      accentProfile={LESSON_TWO_AUDIO_ACCENT_PROFILE}
                      speechLang={LESSON_TWO_AUDIO_SPEECH_LANG}
                      size="xs"
                    />
                  </div>
                  {gloss ? (
                    <p
                      className="mt-1 text-xs italic text-[#0F6E56]/60"
                      lang={locale === "es" ? "es" : "en"}
                    >
                      {gloss}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[#1D9E75]">
                    {t(FORMULA_REGISTER_HINT_PREFIX, locale)}
                    {register}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 7. Mini-scenario */}
        <section
          aria-label={t(PREVIEW_SCENARIO_FULL_LABEL, locale)}
          className="mt-7"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <Users className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_SCENARIO_FULL_LABEL, locale)}
          </p>
          <article className="mt-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5">
            <h3 className="text-sm font-bold tracking-tight text-[#0F6E56]">
              {pickLocaleField(
                locale,
                content.miniScenario.titleFr,
                content.miniScenario.titleEn,
                content.miniScenario.titleEs,
              )}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/65">
              {pickLocaleField(
                locale,
                content.miniScenario.contextFr,
                content.miniScenario.contextEn,
                content.miniScenario.contextEs,
              )}
            </p>
            <ol
              role="list"
              className="mt-3 space-y-2 text-sm leading-relaxed"
            >
              {content.miniScenario.lines.map((line, lineIndex) => (
                <li
                  key={`l2-scenario-line-${lineIndex}`}
                  className="rounded-xl bg-[#F4FBF9] px-3 py-2"
                >
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#1D9E75]">
                    {pickLocaleField(
                      locale,
                      line.speakerFr,
                      line.speakerEn,
                      line.speakerEs,
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap items-start gap-2">
                    <p
                      className="font-medium text-[#0F6E56]"
                      lang="fr-CA"
                    >
                      {line.frQuebec}
                    </p>
                    <YoFrenchAudioButton
                      text={line.frQuebec}
                      locale={locale}
                      moduleId={LESSON_TWO_AUDIO_MODULE_ID}
                      lessonId={LESSON_TWO_AUDIO_LESSON_ID}
                      accentProfile={LESSON_TWO_AUDIO_ACCENT_PROFILE}
                      speechLang={LESSON_TWO_AUDIO_SPEECH_LANG}
                      size="xs"
                    />
                  </div>
                  <p
                    className="mt-1 text-xs text-[#0F6E56]/70"
                    lang={locale === "es" ? "es" : "en"}
                  >
                    {locale === "es" && line.spanish
                      ? line.spanish
                      : line.english}
                  </p>
                  {pickLocaleField(
                    locale,
                    line.noteFr ?? "",
                    line.noteEn ?? "",
                    line.noteEs,
                  ) ? (
                    <p className="mt-2 text-[0.7rem] leading-relaxed text-[#0F6E56]/55">
                      {pickLocaleField(
                        locale,
                        line.noteFr ?? "",
                        line.noteEn ?? "",
                        line.noteEs,
                      )}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </article>
        </section>

        {/* 8. Quick quiz */}
        <section
          aria-label={t(PREVIEW_QUIZ_LABEL, locale)}
          className="mt-7"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <Sparkles className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_QUIZ_LABEL, locale)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/60">
            {t(QUIZ_TAGLINE, locale)}
          </p>
          <ol role="list" className="mt-3 space-y-3">
            {content.quizQuestions.map((question, questionIndex) => {
              const correct = question.options.find(
                (opt) => opt.id === question.correctOptionId,
              );
              return (
                <li
                  key={question.id}
                  className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
                >
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                    {`${t(QUESTION_NUMBER_LABEL, locale)} ${questionIndex + 1}`}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#0F6E56]">
                    {pickLocaleField(
                      locale,
                      question.promptFr,
                      question.promptEn,
                      question.promptEs,
                    )}
                  </p>
                  <ul role="list" className="mt-2 space-y-1.5 text-sm">
                    {question.options.map((option) => {
                      const optionGloss =
                        locale === "en"
                          ? option.glossEn
                          : locale === "es"
                            ? option.glossEs
                            : undefined;
                      return (
                        <li
                          key={option.id}
                          className="flex items-start gap-2 rounded-xl bg-[#F4FBF9]/70 px-3 py-2"
                        >
                          <span
                            aria-hidden
                            className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-[#1D9E75]"
                          />
                          <div className="flex-1">
                            <p
                              className="font-medium text-[#0F6E56]"
                              lang="fr-CA"
                            >
                              {option.targetFr}
                            </p>
                            {optionGloss && optionGloss.length > 0 ? (
                              <p
                                className="mt-1 text-xs text-[#0F6E56]/65"
                                lang={locale === "es" ? "es" : "en"}
                              >
                                {optionGloss}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {correct ? (
                    (() => {
                      const correctGloss =
                        locale === "en"
                          ? correct.glossEn
                          : locale === "es"
                            ? correct.glossEs
                            : undefined;
                      return (
                        <details className="mt-3 rounded-xl bg-[#DDF4F1]/40 px-3 py-2 text-xs leading-relaxed text-[#0F6E56]/80">
                          <summary className="cursor-pointer font-bold text-[#0F6E56]">
                            {t(QUIZ_ANSWER_LABEL, locale)}
                          </summary>
                          <p
                            className="mt-2 font-medium text-[#0F6E56]"
                            lang="fr-CA"
                          >
                            {correct.targetFr}
                          </p>
                          {correctGloss && correctGloss.length > 0 ? (
                            <p
                              className="mt-1 text-xs text-[#0F6E56]/65"
                              lang={locale === "es" ? "es" : "en"}
                            >
                              {correctGloss}
                            </p>
                          ) : null}
                          <p className="mt-2">
                            <span className="font-semibold text-[#0F6E56]">
                              {t(QUIZ_EXPLANATION_LABEL, locale)} :{" "}
                            </span>
                            {pickLocaleField(
                              locale,
                              question.explanationFr,
                              question.explanationEn,
                              question.explanationEs,
                            )}
                          </p>
                        </details>
                      );
                    })()
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>

        {/* 9. Flashcards */}
        <section
          aria-label={t(PREVIEW_FLASHCARDS_LABEL, locale)}
          className="mt-7"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <Layers className="size-4 text-[#1D9E75]" aria-hidden />
            {t(PREVIEW_FLASHCARDS_LABEL, locale)}
          </p>
          <ul
            role="list"
            className="mt-3 grid gap-3 sm:grid-cols-2"
          >
            {content.flashcards.map((card) => (
              <li
                key={card.id}
                className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)]"
              >
                <p
                  className="text-base font-semibold leading-snug text-[#0F6E56]"
                  lang="fr-CA"
                >
                  {card.frontFr}
                </p>
                <p
                  className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80"
                  lang={locale === "es" ? "es" : "en"}
                >
                  {locale === "es" ? card.backEs : card.backEn}
                </p>
                {pickLocaleField(
                  locale,
                  card.hintFr ?? "",
                  card.hintEn ?? "",
                  card.hintEs,
                ) ? (
                  <p className="mt-2 rounded-lg bg-[#FFF4D6]/60 px-3 py-2 text-xs leading-relaxed text-[#5a3f0f]">
                    <span className="font-semibold text-[#5a3f0f]">
                      {t(FLASHCARD_HINT_LABEL, locale)}
                    </span>
                    {pickLocaleField(
                      locale,
                      card.hintFr ?? "",
                      card.hintEn ?? "",
                      card.hintEs,
                    )}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* 10. Teacher CTA (consent-safe) */}
        <section
          aria-label={t(PREVIEW_TEACHER_CTA_LABEL, locale)}
          className="mt-7 rounded-2xl border border-[#F4B400]/40 bg-[#FFF4D6]/70 p-4 sm:p-5"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]">
            <GraduationCap className="size-4 text-[#0F6E56]" aria-hidden />
            {t(PREVIEW_TEACHER_CTA_LABEL, locale)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#5a3f0f]">
            {teacherCta}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[#5a3f0f]/80">
            {t(PREVIEW_TEACHER_NOTE, locale)}
          </p>
          <Link
            href={teacherBridgeHref}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(15,110,86,0.18)] transition hover:bg-[#0b5b47]"
          >
            <MessageCircle className="size-4" aria-hidden />
            {t(PREVIEW_BROWSE_TEACHERS_CTA, locale)}
          </Link>
        </section>

        {/* 11. Next-lesson teaser */}
        <section
          aria-label={t(PREVIEW_NEXT_LESSON_LABEL, locale)}
          className="mt-7 rounded-2xl border border-[#0F6E56]/12 bg-[#0F6E56]/5 p-4 sm:p-5"
        >
          <p className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
            <ArrowRightCircle
              className="size-4 text-[#1D9E75]"
              aria-hidden
            />
            {t(PREVIEW_NEXT_LESSON_LABEL, locale)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/85 sm:text-[0.95rem]">
            {nextTeaser}
          </p>
        </section>
      </div>
    </section>
  );
}

export function YoPremiumModuleShell(props: YoPremiumModuleShellProps) {
  const {
    locale,
    titleFr,
    titleEn,
    titleEs,
    taglineFr,
    taglineEn,
    taglineEs,
    audienceFr,
    audienceEn,
    audienceEs,
    honestPromiseFr,
    honestPromiseEn,
    honestPromiseEs,
    lessons,
    teacherBridgeTitleFr,
    teacherBridgeTitleEn,
    teacherBridgeTitleEs,
    teacherBridgeBodyFr,
    teacherBridgeBodyEn,
    teacherBridgeBodyEs,
    comingSoonBodyFr,
    comingSoonBodyEn,
    comingSoonBodyEs,
    languageBreadcrumbFr,
    languageBreadcrumbEn,
    languageBreadcrumbEs,
    futureCrumbFr,
    futureCrumbEn,
    futureCrumbEs,
    introHref,
    teacherBridgeHref,
    hubHref = "/yo/langues",
  } = props;

  const title: YoLocalizedString = lstr(titleFr, titleEn, titleEs);
  const tagline: YoLocalizedString = lstr(taglineFr, taglineEn, taglineEs);
  const audience: YoLocalizedString = lstr(
    audienceFr,
    audienceEn,
    audienceEs,
  );
  const honestPromise: YoLocalizedString = lstr(
    honestPromiseFr,
    honestPromiseEn,
    honestPromiseEs,
  );
  const teacherBridgeTitle: YoLocalizedString = lstr(
    teacherBridgeTitleFr,
    teacherBridgeTitleEn,
    teacherBridgeTitleEs,
  );
  const teacherBridgeBody: YoLocalizedString = lstr(
    teacherBridgeBodyFr,
    teacherBridgeBodyEn,
    teacherBridgeBodyEs,
  );
  const comingSoonBody: YoLocalizedString = lstr(
    comingSoonBodyFr,
    comingSoonBodyEn,
    comingSoonBodyEs,
  );
  const languageCrumb: YoLocalizedString = lstr(
    languageBreadcrumbFr,
    languageBreadcrumbEn,
    languageBreadcrumbEs,
  );
  const futureCrumb: YoLocalizedString = lstr(
    futureCrumbFr,
    futureCrumbEn,
    futureCrumbEs,
  );

  // Collect every lesson tagged "preview" with a populated `content`
  // body. We render one preview block per lesson, dispatching on the
  // `content.kind` discriminator: `lesson1` → `LessonOnePreview`,
  // `lesson2` → `LessonTwoPreview`. Future lessons (3+) opt in by
  // setting `status: "preview"`, providing a `content` block with
  // their own `kind`, and registering a renderer here.
  const previewLessons = lessons.filter(
    (lesson) => lesson.status === "preview" && lesson.content,
  );

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB] text-[#0F6E56]">
      <main id="main-content" className="flex flex-col pb-20">
        <YoBreadcrumb
          items={[
            { label: lstr("YoPratiqo", "YoPratiqo"), href: "/yo" },
            { label: lstr("Langues", "Languages"), href: hubHref },
            { label: languageCrumb, href: introHref.replace(/\/intro$/, "") },
            { label: futureCrumb },
          ]}
          locale={locale}
        />

        {/* Hero — “Bientôt disponible” */}
        <section
          aria-labelledby="yo-fr-qc-mod1-title"
          className="relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(15,110,86,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(244,180,0,0.18),transparent_32%),linear-gradient(180deg,#fbfdff_0%,#dde9f4_45%,#ddf4f1_100%)]"
          />
          <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-5 pt-10 pb-10 sm:px-8 sm:pt-12 sm:pb-14">
            {/* Visible FR / EN / ES language switcher. Rendered at the
                top of the hero block so a learner who landed in the
                "wrong" locale can pivot before reading the title or
                lesson preview. The base path is hardcoded because
                this shell is the Quebec French module shell
                specifically; threading a prop would add coupling
                without adding flexibility. */}
            <YoLocaleSwitcher
              currentLocale={locale}
              basePath="/yo/langues/francais-quebec/module-1"
              className="self-start"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0F6E56]/30 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
                {t(HERO_LABEL, locale)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F4B400]/45 bg-[#FFF4D6] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#8a5a17]">
                <Clock className="size-3.5" aria-hidden />
                {t(COMING_SOON_PILL, locale)}
              </span>
            </div>
            <h1
              id="yo-fr-qc-mod1-title"
              className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-4xl lg:text-[2.75rem]"
            >
              {t(title, locale)}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#0F6E56]/78 sm:text-lg">
              {t(tagline, locale)}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                href={introHref}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0F6E56]/18 bg-white px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-[#DDF4F1]/70"
              >
                <Compass className="size-4" aria-hidden />
                {t(RETURN_INTRO_CTA, locale)}
              </Link>
              <Link
                href={teacherBridgeHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.22)] transition hover:bg-[#0b5b47]"
              >
                <MessageCircle className="size-4" aria-hidden />
                {t(FIND_TEACHER_CTA, locale)}
              </Link>
            </div>
          </div>
        </section>

        {/* Audience + honest promise */}
        <section
          aria-labelledby="yo-fr-qc-mod1-audience-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(AUDIENCE_LABEL, locale)}
          </span>
          <h2
            id="yo-fr-qc-mod1-audience-title"
            className="mt-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.65rem]"
          >
            {t(AUDIENCE_TITLE, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/78 sm:text-[0.95rem]">
            {t(audience, locale)}
          </p>

          <div className="mt-5 rounded-2xl border border-[#DDF4F1] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:px-5 sm:py-5">
            <p className="text-[0.8rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
              {t(HONEST_PROMISE_LABEL, locale)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/80">
              {t(honestPromise, locale)}
            </p>
          </div>
        </section>

        {/* Rich free previews — one block per lesson tagged
            `status: "preview"`. Dispatch on `content.kind` so Lesson 1
            and Lesson 2 each get their dedicated renderer. */}
        {previewLessons.map((previewLesson) => {
          const content = previewLesson.content;
          if (!content) return null;
          if (content.kind === "lesson1") {
            return (
              <LessonOnePreview
                key={previewLesson.id}
                locale={locale}
                lesson={previewLesson}
                teacherBridgeHref={teacherBridgeHref}
              />
            );
          }
          if (content.kind === "lesson2") {
            return (
              <LessonTwoPreview
                key={previewLesson.id}
                locale={locale}
                lesson={previewLesson}
                teacherBridgeHref={teacherBridgeHref}
              />
            );
          }
          return null;
        })}

        {/* Lesson outline — 7 cards (locked / future status) */}
        <section
          aria-labelledby="yo-fr-qc-mod1-outline-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(LESSON_OUTLINE_LABEL, locale)}
          </span>
          <h2
            id="yo-fr-qc-mod1-outline-title"
            className="mt-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            {t(LESSON_OUTLINE_TITLE, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/78">
            {t(LESSON_OUTLINE_BODY, locale)}
          </p>
          <ol
            role="list"
            className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {lessons.map((lesson, index) => {
              const isPreview =
                lesson.status === "preview" && lesson.content !== undefined;
              const badgeLabel = isPreview
                ? LESSON_PREVIEW_LABEL
                : LESSON_LOCKED_LABEL;
              // The in-page anchor matches the `id="lecon-N"` that
              // LessonOnePreview / LessonTwoPreview set on their
              // section element — keep them positional so Lesson 3+
              // will Just Work the day they ship a preview body.
              const previewAnchor = `#lecon-${index + 1}`;
              return (
              <li
                key={lesson.id}
                className="flex flex-col gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                      {`${t(LESSON_NUMBER_LABEL, locale)} ${index + 1}`}
                    </p>
                    <h3 className="mt-1 text-base font-semibold leading-snug text-[#0F6E56]">
                      {isPreview ? (
                        <Link
                          href={previewAnchor}
                          className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]"
                        >
                          {pickLocaleField(
                            locale,
                            lesson.titleFr,
                            lesson.titleEn,
                            lesson.titleEs,
                          )}
                        </Link>
                      ) : (
                        pickLocaleField(
                          locale,
                          lesson.titleFr,
                          lesson.titleEn,
                          lesson.titleEs,
                        )
                      )}
                    </h3>
                  </div>
                  <span
                    aria-label={t(badgeLabel, locale)}
                    className={
                      isPreview
                        ? "inline-flex shrink-0 items-center gap-1 rounded-full bg-[#DDF4F1] px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]"
                        : "inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF4D6] px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#8a5a17]"
                    }
                  >
                    {isPreview ? (
                      <Sparkles className="size-3" aria-hidden />
                    ) : (
                      <Lock className="size-3" aria-hidden />
                    )}
                    {t(badgeLabel, locale)}
                  </span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0F6E56]/60">
                  <Clock className="mr-1 inline size-3" aria-hidden />
                  {formatMinutes(lesson.estimatedMinutes, locale)}
                </p>
                <p className="text-sm leading-relaxed text-[#0F6E56]/80">
                  {pickLocaleField(
                    locale,
                    lesson.scenarioFr,
                    lesson.scenarioEn,
                    lesson.scenarioEs,
                  )}
                </p>
                <div>
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                    {t(LESSON_GOALS_LABEL, locale)}
                  </p>
                  <ul
                    role="list"
                    className="mt-1 space-y-1 text-sm leading-relaxed text-[#0F6E56]/76"
                  >
                    {(locale === "es"
                      ? lesson.learningGoalsEs
                      : locale === "en"
                        ? lesson.learningGoalsEn
                        : lesson.learningGoalsFr
                    ).map((goal, goalIndex) => (
                      <li
                        key={`${lesson.id}-goal-${goalIndex}`}
                        className="flex gap-2"
                      >
                        <span
                          aria-hidden
                          className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-[#1D9E75]"
                        />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="rounded-xl bg-[#DDF4F1]/50 px-3 py-2 text-xs leading-relaxed text-[#0F6E56]/78">
                  <span className="font-black uppercase tracking-[0.12em] text-[#1D9E75]">
                    {t(LESSON_BRIDGE_LABEL, locale)}.
                  </span>{" "}
                  {pickLocaleField(
                    locale,
                    lesson.teacherBridgePromptFr,
                    lesson.teacherBridgePromptEn,
                    lesson.teacherBridgePromptEs,
                  )}
                </p>
              </li>
              );
            })}
          </ol>
        </section>

        {/* Teacher bridge */}
        <section
          aria-labelledby="yo-fr-qc-mod1-bridge-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <article className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_8px_24px_rgba(15,58,52,0.07)] sm:p-8">
            <div
              aria-hidden
              className="absolute -right-16 -top-16 size-52 rounded-full bg-[#F4B400]/20 blur-3xl"
            />
            <div className="relative grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <span className="ds-label text-[#8a5a17]">
                  {t(TEACHER_BRIDGE_LABEL, locale)}
                </span>
                <h2
                  id="yo-fr-qc-mod1-bridge-title"
                  className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-[1.65rem]"
                >
                  <GraduationCap
                    className="size-5 text-[#0F6E56]"
                    aria-hidden
                  />
                  {t(teacherBridgeTitle, locale)}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#1a3a32]/78 sm:text-[0.95rem]">
                  {t(teacherBridgeBody, locale)}
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <Link
                  href={teacherBridgeHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.22)] transition hover:bg-[#0b5b47]"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  {t(TEACHER_BRIDGE_CTA, locale)}
                </Link>
              </div>
            </div>
          </article>
        </section>

        {/* Coming-soon notice */}
        <section
          aria-labelledby="yo-fr-qc-mod1-coming-soon-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <span className="ds-label text-[#1D9E75]">
            {t(COMING_SOON_LABEL, locale)}
          </span>
          <h2
            id="yo-fr-qc-mod1-coming-soon-title"
            className="mt-2 flex items-center gap-2 text-2xl font-medium tracking-tight text-[#0F6E56] sm:text-[1.75rem]"
          >
            <Lock className="size-5 text-[#1D9E75]" aria-hidden />
            {t(COMING_SOON_TITLE, locale)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#0F6E56]/78 sm:text-[0.95rem]">
            {t(comingSoonBody, locale)}
          </p>
          <ul
            role="list"
            className="mt-5 flex flex-wrap gap-2"
          >
            <li className="inline-flex items-center gap-1.5 rounded-full border border-[#F4B400]/45 bg-[#FFF4D6] px-3 py-1.5 text-xs font-bold text-[#8a5a17]">
              <Lock className="size-3.5" aria-hidden />
              {t(NO_CHECKOUT_PILL, locale)}
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-[#F4B400]/45 bg-[#FFF4D6] px-3 py-1.5 text-xs font-bold text-[#8a5a17]">
              <Lock className="size-3.5" aria-hidden />
              {t(NO_PAID_ACCESS_PILL, locale)}
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-[#F4B400]/45 bg-[#FFF4D6] px-3 py-1.5 text-xs font-bold text-[#8a5a17]">
              <Lock className="size-3.5" aria-hidden />
              {t(NO_PRICE_PILL, locale)}
            </li>
          </ul>
        </section>

        {/* Legal-safe disclaimer */}
        <section
          aria-label={t(LEGAL_NOTICE_ARIA, locale)}
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <YoLegalDisclaimer locale={locale} />
        </section>
      </main>
    </div>
  );
}
