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
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  GraduationCap,
  Lightbulb,
  Lock,
  MapPin,
  MessageCircle,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import { YoBreadcrumb } from "@/components/yo/YoBreadcrumb";
import { YoLegalDisclaimer } from "@/components/yo/YoLegalDisclaimer";
import type {
  FrQuebecLessonOneContent,
  FrQuebecModuleLesson,
} from "@/lib/yo/frQuebecWorkplaceSurvivalModule";

export interface YoPremiumModuleShellProps {
  locale: YoLocale;
  /** Display title in both languages. */
  titleFr: string;
  titleEn: string;
  /** One-line tagline rendered under the hero title. */
  taglineFr: string;
  taglineEn: string;
  /** Audience description (newcomers / Canadian learners / workers). */
  audienceFr: string;
  audienceEn: string;
  /** Honest disclaimer surfaced directly below the audience block. */
  honestPromiseFr: string;
  honestPromiseEn: string;
  /** Lessons rendered as locked/preview cards. Expected length: 7. */
  lessons: readonly FrQuebecModuleLesson[];
  /** Teacher-bridge title + body (rendered above the /trouver-un-prof CTA). */
  teacherBridgeTitleFr: string;
  teacherBridgeTitleEn: string;
  teacherBridgeBodyFr: string;
  teacherBridgeBodyEn: string;
  /** Coming-soon notice copy rendered near the bottom of the page. */
  comingSoonBodyFr: string;
  comingSoonBodyEn: string;
  /** Breadcrumb labels for the language hub crumb (e.g. "Français québécois"). */
  languageBreadcrumbFr: string;
  languageBreadcrumbEn: string;
  /** Localized "future module" leaf crumb. */
  futureCrumbFr: string;
  futureCrumbEn: string;
  /**
   * Path back to the free intro for the same language. Rendered as a
   * primary visible CTA in the hero; the shell never links to a paid
   * destination because no paid surface exists yet.
   */
  introHref: string;
  /** Path to the teacher-search bridge (always `/trouver-un-prof?q=…`). */
  teacherBridgeHref: string;
  /**
   * Optional path to the YoPratiqo language hub for the breadcrumb.
   * Defaults to "/yo/langues" when omitted.
   */
  hubHref?: string;
}

const HERO_LABEL = lstr("Module futur YoPratiqo", "Future YoPratiqo module");
const COMING_SOON_PILL = lstr("Bientôt disponible", "Coming soon");
const AUDIENCE_LABEL = lstr("Pour qui", "Who it is for");
const HONEST_PROMISE_LABEL = lstr(
  "Notre engagement honnête",
  "Our honest commitment",
);
const LESSON_OUTLINE_LABEL = lstr(
  "Plan complet du module",
  "Full module outline",
);
const LESSON_OUTLINE_TITLE = lstr(
  "Sept courtes leçons, sept situations concrètes",
  "Seven short lessons, seven concrete situations",
);
const LESSON_OUTLINE_BODY = lstr(
  "Chaque leçon est une mini-mise en situation : un contexte, trois objectifs et quelques phrases utiles. La leçon 1 est ouverte en aperçu gratuit ; les six autres restent à venir.",
  "Each lesson is a small role-play: a context, three goals, and a few useful phrases. Lesson 1 is open as a free preview; the other six are still upcoming.",
);
const LESSON_LOCKED_LABEL = lstr("Verrouillé · futur", "Locked · upcoming");
const LESSON_PREVIEW_LABEL = lstr("Aperçu disponible", "Preview available");
const LESSON_GOALS_LABEL = lstr("Objectifs", "Learning goals");
const LESSON_BRIDGE_LABEL = lstr("Avec un professeur", "With a teacher");

const PREVIEW_EYEBROW = lstr(
  "Aperçu gratuit · Leçon 1",
  "Free preview · Lesson 1",
);
const PREVIEW_OBJECTIVE_LABEL = lstr("Objectif", "Objective");
const PREVIEW_SCENARIO_LABEL = lstr("Mise en situation", "Scenario");
const PREVIEW_CULTURE_LABEL = lstr("Note culturelle", "Cultural note");
const PREVIEW_PHRASES_LABEL = lstr("Phrases-clés", "Core phrases");
const PREVIEW_DIALOGUES_LABEL = lstr("Mini-dialogues", "Mini-dialogues");
const PREVIEW_TUVOUS_LABEL = lstr("Tu ou vous ?", "Tu or vous?");
const PREVIEW_QUIZ_LABEL = lstr("Petit quiz", "Quick quiz");
const PREVIEW_REFLECTION_LABEL = lstr("Réflexion", "Reflection");
const PREVIEW_BRIDGE_LABEL = lstr(
  "Avec un professeur",
  "With a teacher",
);

const REGISTER_LABELS: Record<
  "informal" | "neutral" | "formal",
  YoLocalizedString
> = {
  informal: lstr("Familier", "Informal"),
  neutral: lstr("Neutre", "Neutral"),
  formal: lstr("Soutenu", "Formal"),
};

const TUVOUS_BADGE_LABELS: Record<
  "tu" | "vous" | "follow",
  YoLocalizedString
> = {
  tu: lstr("Choix sûr · « tu »", "Safest · « tu »"),
  vous: lstr("Choix sûr · « vous »", "Safest · « vous »"),
  follow: lstr(
    "Choix sûr · suivez la personne",
    "Safest · follow the other person",
  ),
};

const QUIZ_ANSWER_LABEL = lstr("Réponse", "Answer");
const QUIZ_EXPLANATION_LABEL = lstr("Pourquoi", "Why");

const REFLECTION_HELP = lstr(
  "Cette question est uniquement pour vous — rien n’est transmis ni partagé.",
  "This question is just for you — nothing is sent or shared.",
);

const PREVIEW_TEACHER_NOTE = lstr(
  "Pratiquez ce scénario à voix haute avec un professeur Pratiqo lorsque vous serez prêt — vous choisissez quand et avec qui.",
  "Practice this scenario out loud with a Pratiqo teacher when you’re ready — you decide when and with whom.",
);

const TEACHER_BRIDGE_LABEL = lstr(
  "Pont vers un professeur",
  "Teacher bridge",
);
const TEACHER_BRIDGE_CTA = lstr(
  "Trouver un professeur sur Pratiqo",
  "Find a teacher on Pratiqo",
);

const RETURN_INTRO_CTA = lstr(
  "Retour à l’intro gratuite",
  "Back to the free intro",
);
const FIND_TEACHER_CTA = lstr(
  "Trouver un professeur",
  "Find a teacher",
);

const COMING_SOON_LABEL = lstr(
  "À propos de ce module",
  "About this module",
);
const COMING_SOON_TITLE = lstr(
  "Aperçu d’un futur module YoPratiqo",
  "Preview of a future YoPratiqo module",
);
const NO_CHECKOUT_PILL = lstr(
  "Achat indisponible pour le moment",
  "Purchase not available yet",
);
const NO_PAID_ACCESS_PILL = lstr(
  "Accès payant non activé",
  "Paid access not active",
);
const NO_PRICE_PILL = lstr(
  "Aucun prix en vigueur",
  "No live pricing in effect",
);

function formatMinutes(minutes: number, locale: YoLocale): string {
  return locale === "fr" ? `≈ ${minutes} min` : `≈ ${minutes} min`;
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
  const content: FrQuebecLessonOneContent | undefined = lesson.content;
  if (!content) return null;

  const lessonTitle = locale === "fr" ? lesson.titleFr : lesson.titleEn;
  const objective =
    locale === "fr" ? content.objectiveFr : content.objectiveEn;
  const scenario =
    locale === "fr" ? content.scenarioFr : content.scenarioEn;
  const cultural =
    locale === "fr" ? content.culturalNoteFr : content.culturalNoteEn;
  const reflection =
    locale === "fr"
      ? content.reflectionPromptFr
      : content.reflectionPromptEn;
  const bridgePrompt =
    locale === "fr"
      ? content.teacherBridgePromptFr
      : content.teacherBridgePromptEn;

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
            lang={locale === "fr" ? undefined : "en"}
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
                  <p
                    className="text-base font-semibold leading-snug text-[#0F6E56]"
                    lang="fr-CA"
                  >
                    {phrase.frQuebec}
                  </p>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-[#DDF4F1]/70 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                    {t(REGISTER_LABELS[phrase.register], locale)}
                  </span>
                </div>
                {phrase.standardFrench ? (
                  <p
                    className="mt-1 text-xs italic text-[#0F6E56]/65"
                    lang="fr"
                  >
                    {locale === "fr" ? "Standard : " : "Standard French: "}
                    {phrase.standardFrench}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/85">
                  {phrase.english}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/70">
                  <span className="font-semibold text-[#0F6E56]/75">
                    {locale === "fr" ? "Quand : " : "When: "}
                  </span>
                  {locale === "fr" ? phrase.usageFr : phrase.usageEn}
                </p>
                {(locale === "fr" ? phrase.noteFr : phrase.noteEn) ? (
                  <p className="mt-2 rounded-lg bg-[#FFF4D6]/60 px-3 py-2 text-xs leading-relaxed text-[#5a3f0f]">
                    {locale === "fr" ? phrase.noteFr : phrase.noteEn}
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
                  {locale === "fr" ? dialogue.titleFr : dialogue.titleEn}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#0F6E56]/65">
                  {locale === "fr" ? dialogue.contextFr : dialogue.contextEn}
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
                        {locale === "fr"
                          ? line.speakerFr
                          : line.speakerEn}
                      </p>
                      <p
                        className="mt-1 font-medium text-[#0F6E56]"
                        lang="fr-CA"
                      >
                        {line.frQuebec}
                      </p>
                      <p className="mt-1 text-xs text-[#0F6E56]/70">
                        {line.english}
                      </p>
                      {(locale === "fr" ? line.noteFr : line.noteEn) ? (
                        <p className="mt-2 text-[0.7rem] leading-relaxed text-[#0F6E56]/55">
                          {locale === "fr" ? line.noteFr : line.noteEn}
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
                  {locale === "fr"
                    ? `Situation ${situationIndex + 1}`
                    : `Situation ${situationIndex + 1}`}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#0F6E56]/85">
                  {locale === "fr"
                    ? situation.situationFr
                    : situation.situationEn}
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#DDF4F1]/70 px-3 py-1 text-xs font-bold text-[#0F6E56]">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  {t(TUVOUS_BADGE_LABELS[situation.safestChoice], locale)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#0F6E56]/70">
                  {locale === "fr"
                    ? situation.explanationFr
                    : situation.explanationEn}
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
            {locale === "fr"
              ? "Cinq questions courtes — pas de note, pas de chronomètre. Pour vous, à votre rythme."
              : "Five short questions — no score, no timer. For you, at your own pace."}
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
                    {locale === "fr"
                      ? `Question ${questionIndex + 1}`
                      : `Question ${questionIndex + 1}`}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#0F6E56]">
                    {locale === "fr"
                      ? question.promptFr
                      : question.promptEn}
                  </p>
                  <ul role="list" className="mt-2 space-y-1.5 text-sm">
                    {question.options.map((option) => (
                      <li
                        key={option.id}
                        className="flex items-start gap-2 rounded-xl bg-[#F4FBF9]/70 px-3 py-2 text-[#0F6E56]/85"
                      >
                        <span
                          aria-hidden
                          className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-[#1D9E75]"
                        />
                        {locale === "fr" ? option.labelFr : option.labelEn}
                      </li>
                    ))}
                  </ul>
                  {correct ? (
                    <details className="mt-3 rounded-xl bg-[#DDF4F1]/40 px-3 py-2 text-xs leading-relaxed text-[#0F6E56]/80">
                      <summary className="cursor-pointer font-bold text-[#0F6E56]">
                        {t(QUIZ_ANSWER_LABEL, locale)}
                      </summary>
                      <p className="mt-2">
                        <span className="font-semibold text-[#0F6E56]">
                          {locale === "fr"
                            ? correct.labelFr
                            : correct.labelEn}
                        </span>
                      </p>
                      <p className="mt-2">
                        <span className="font-semibold text-[#0F6E56]">
                          {t(QUIZ_EXPLANATION_LABEL, locale)} :{" "}
                        </span>
                        {locale === "fr"
                          ? question.explanationFr
                          : question.explanationEn}
                      </p>
                    </details>
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
            {locale === "fr"
              ? "Voir les professeurs Pratiqo"
              : "Browse Pratiqo teachers"}
          </Link>
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
    taglineFr,
    taglineEn,
    audienceFr,
    audienceEn,
    honestPromiseFr,
    honestPromiseEn,
    lessons,
    teacherBridgeTitleFr,
    teacherBridgeTitleEn,
    teacherBridgeBodyFr,
    teacherBridgeBodyEn,
    comingSoonBodyFr,
    comingSoonBodyEn,
    languageBreadcrumbFr,
    languageBreadcrumbEn,
    futureCrumbFr,
    futureCrumbEn,
    introHref,
    teacherBridgeHref,
    hubHref = "/yo/langues",
  } = props;

  const title: YoLocalizedString = lstr(titleFr, titleEn);
  const tagline: YoLocalizedString = lstr(taglineFr, taglineEn);
  const audience: YoLocalizedString = lstr(audienceFr, audienceEn);
  const honestPromise: YoLocalizedString = lstr(
    honestPromiseFr,
    honestPromiseEn,
  );
  const teacherBridgeTitle: YoLocalizedString = lstr(
    teacherBridgeTitleFr,
    teacherBridgeTitleEn,
  );
  const teacherBridgeBody: YoLocalizedString = lstr(
    teacherBridgeBodyFr,
    teacherBridgeBodyEn,
  );
  const comingSoonBody: YoLocalizedString = lstr(
    comingSoonBodyFr,
    comingSoonBodyEn,
  );
  const languageCrumb: YoLocalizedString = lstr(
    languageBreadcrumbFr,
    languageBreadcrumbEn,
  );
  const futureCrumb: YoLocalizedString = lstr(futureCrumbFr, futureCrumbEn);

  // Pick the first lesson tagged "preview" to render the rich free
  // preview body. Today only Lesson 1 carries a populated `content`
  // block; future lessons can opt in by setting `status: "preview"`
  // and providing their own content block. If none qualify, the
  // preview section is simply not rendered.
  const previewLesson = lessons.find(
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
            {locale === "fr"
              ? "Pensé pour les apprenants déjà au Québec ou en route"
              : "Built for learners already in Quebec — or on their way"}
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

        {/* Lesson 1 — free preview (rendered only when a lesson is
            tagged status: "preview" with a populated `content` body) */}
        {previewLesson ? (
          <LessonOnePreview
            locale={locale}
            lesson={previewLesson}
            teacherBridgeHref={teacherBridgeHref}
          />
        ) : null}

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
              return (
              <li
                key={lesson.id}
                className="flex flex-col gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                      {locale === "fr"
                        ? `Leçon ${index + 1}`
                        : `Lesson ${index + 1}`}
                    </p>
                    <h3 className="mt-1 text-base font-semibold leading-snug text-[#0F6E56]">
                      {isPreview ? (
                        <Link
                          href="#lecon-1"
                          className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]"
                        >
                          {locale === "fr" ? lesson.titleFr : lesson.titleEn}
                        </Link>
                      ) : locale === "fr" ? (
                        lesson.titleFr
                      ) : (
                        lesson.titleEn
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
                  {locale === "fr" ? lesson.scenarioFr : lesson.scenarioEn}
                </p>
                <div>
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
                    {t(LESSON_GOALS_LABEL, locale)}
                  </p>
                  <ul
                    role="list"
                    className="mt-1 space-y-1 text-sm leading-relaxed text-[#0F6E56]/76"
                  >
                    {(locale === "fr"
                      ? lesson.learningGoalsFr
                      : lesson.learningGoalsEn
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
                  {locale === "fr"
                    ? lesson.teacherBridgePromptFr
                    : lesson.teacherBridgePromptEn}
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
          aria-label={
            locale === "fr"
              ? "Avis légal éducatif"
              : "Educational legal notice"
          }
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <YoLegalDisclaimer locale={locale} />
        </section>
      </main>
    </div>
  );
}
