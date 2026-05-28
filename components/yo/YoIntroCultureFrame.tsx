/**
 * Rich, static learning frame for the YoPratiqo Voyage-section intro.
 *
 * These blocks are intentionally visual-only and local-data-only for now:
 * no Supabase, no Stripe, no teacher dashboard integration. They make the
 * intro feel like a real cultural learning product while keeping the MVP
 * architecture simple and safe.
 */

import {
  BookOpenCheck,
  CheckCircle2,
  Compass,
  GraduationCap,
  Music2,
  Sparkles,
  Users,
} from "lucide-react";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import { YoImageVisual } from "@/components/yo/YoImageVisual";
import { t } from "@/lib/yo/localize";

const ESSENTIAL_QUESTIONS: YoLocalizedString[] = [
  {
    fr: "Qu’est-ce qui rend la République dominicaine différente d’un simple resort ?",
    en: "What makes the Dominican Republic more than just a resort destination?",
  },
  {
    fr: "Pourquoi Santo Domingo est-elle si importante dans l’histoire des Amériques ?",
    en: "Why is Santo Domingo so important in the history of the Americas?",
  },
  {
    fr: "Qu’est-ce que je dois comprendre pour parler avec respect et confiance ?",
    en: "What should I understand to speak with respect and confidence?",
  },
];

const CAN_DO_OUTCOMES: YoLocalizedString[] = [
  { fr: "situer la République dominicaine", en: "locate the Dominican Republic" },
  { fr: "reconnaître quelques éléments culturels importants", en: "recognize key cultural elements" },
  { fr: "saluer et me présenter simplement", en: "greet people and introduce myself simply" },
  { fr: "comprendre quelques expressions dominicaines", en: "understand a few Dominican expressions" },
  { fr: "expliquer à mon professeur ce que je veux pratiquer", en: "tell my teacher what I want to practice" },
];

const CULTURE_POINTS: { title: YoLocalizedString; body: YoLocalizedString }[] = [
  {
    title: { fr: "Merengue et bachata", en: "Merengue and bachata" },
    body: {
      fr: "La musique n’est pas seulement un spectacle: elle fait partie des fêtes, de la rue, des familles et de la mémoire du pays.",
      en: "Music is not just a show: it is part of celebrations, streets, families, and the country's memory.",
    },
  },
  {
    title: { fr: "Baseball partout", en: "Baseball everywhere" },
    body: {
      fr: "Le baseball est un langage social: on en parle au colmado, à la maison et avec fierté.",
      en: "Baseball is a social language: people talk about it at the colmado, at home, and with pride.",
    },
  },
  {
    title: { fr: "Colmados et guaguas", en: "Colmados and guaguas" },
    body: {
      fr: "Les petits commerces et transports partagés montrent la vie quotidienne au-delà des zones touristiques.",
      en: "Small shops and shared transport show everyday life beyond tourist zones.",
    },
  },
  {
    title: { fr: "Famille, nourriture, hospitalité", en: "Family, food, hospitality" },
    body: {
      fr: "Les repas, les réunions de famille et l’accueil chaleureux donnent du sens aux mots que tu apprends.",
      en: "Meals, family gatherings, and warm hospitality give meaning to the words you learn.",
    },
  },
];

const TEACHER_SIGNALS: YoLocalizedString[] = [
  { fr: "Vocabulaire à revoir", en: "Vocabulary to review" },
  { fr: "Expressions dominicaines difficiles", en: "Difficult Dominican expressions" },
  { fr: "Phrases maîtrisées", en: "Phrases mastered" },
  { fr: "Confiance à l’oral", en: "Speaking confidence" },
  { fr: "Prochaine mission recommandée", en: "Recommended next mission" },
];

export function YoIntroLearningFrame({ locale }: { locale: YoLocale }) {
  return (
    <section
      aria-labelledby="yo-essential-title"
      className="mx-auto w-full max-w-5xl px-5 pt-8 sm:px-8 sm:pt-10"
    >
      <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-3xl border border-[#DDF4F1] bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-6">
          <span className="ds-label text-teal-700/90">
            {locale === "fr" ? "Questions essentielles" : "Essential questions"}
          </span>
          <h2
            id="yo-essential-title"
            className="mt-2 text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-[1.65rem]"
          >
            {locale === "fr"
              ? "Avant de mémoriser, on comprend le pays."
              : "Before memorizing, we understand the country."}
          </h2>
          <ol className="mt-5 grid gap-3" role="list">
            {ESSENTIAL_QUESTIONS.map((question, index) => (
              <li key={question.fr} className="flex gap-3 rounded-2xl bg-[#DDF4F1]/55 p-3 ring-1 ring-teal-100/70">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0F6E56] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <span className="text-sm font-medium leading-relaxed text-[#1a3a32] sm:text-[0.95rem]">
                  {t(question, locale)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-[#F4B400]/35 bg-[#FFF4D6] p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-6">
            <span className="ds-label text-[#8a5a17]">
              {locale === "fr" ? "À la fin de cette intro" : "By the end of this intro"}
            </span>
            <h3 className="mt-2 text-xl font-medium tracking-tight text-[#1a3a32]">
              {locale === "fr" ? "Je peux…" : "I can…"}
            </h3>
            <ul className="mt-4 grid gap-2" role="list">
              {CAN_DO_OUTCOMES.map((outcome) => (
                <li key={outcome.fr} className="flex items-start gap-2 text-sm leading-relaxed text-[#1a3a32]/88">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#1D9E75]" aria-hidden />
                  {t(outcome, locale)}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-6">
            <span className="ds-label text-teal-700/90">
              {locale === "fr" ? "Première mission" : "First mission"}
            </span>
            <p className="mt-2 text-sm leading-relaxed text-[#1a3a32]/88">
              {locale === "fr"
                ? "Imagine ton arrivée: tu salues, tu te présentes et tu dis à ton professeur ce que tu veux pratiquer."
                : "Imagine your arrival: you greet someone, introduce yourself, and tell your teacher what you want to practice."}
            </p>
            <p className="mt-3 rounded-2xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900" lang="es">
              Buenas tardes. Me llamo Marc. Quiero practicar la conversación.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function YoCulturePanorama({
  locale,
  imagePath,
  imageAlt,
}: {
  locale: YoLocale;
  imagePath?: string | null;
  imageAlt?: YoLocalizedString;
}) {
  return (
    <section
      aria-labelledby="yo-culture-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="overflow-hidden rounded-3xl border border-teal-100 bg-white shadow-[0_8px_24px_rgba(15,58,52,0.07)]">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
          <div className="p-3 pb-0 lg:p-4 lg:pr-0">
            <YoImageVisual
              imagePath={imagePath}
              alt={
                imageAlt ?? {
                  fr: "Musique et culture dominicaine",
                  en: "Dominican music and culture",
                }
              }
              locale={locale}
              fallbackKind="hero-tropical"
              variant="panel"
              className="h-full rounded-2xl shadow-none"
            />
          </div>
          <div className="flex flex-col gap-5 p-5 sm:p-8">
            <div>
              <span className="ds-label text-teal-700/90">
                {locale === "fr" ? "Panorama culturel" : "Cultural panorama"}
              </span>
              <h2 id="yo-culture-title" className="mt-2 text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-[1.75rem]">
                {locale === "fr"
                  ? "Ce qui rend la République dominicaine unique"
                  : "What makes the Dominican Republic unique"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.95rem]">
                {locale === "fr"
                  ? "YoPratiqo enseigne la langue à l’intérieur de la culture : le rythme, les lieux, les gestes et les situations qui donnent du sens aux mots."
                  : "YoPratiqo teaches language inside culture: rhythm, places, gestures, and situations that give words meaning."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {CULTURE_POINTS.map((point, index) => {
                const Icon = index === 0 ? Music2 : index === 1 ? Sparkles : index === 2 ? Compass : Users;
                return (
                  <article key={point.title.fr} className="rounded-2xl bg-[#FAFCFB] p-4 ring-1 ring-teal-100">
                    <Icon className="mb-3 size-5 text-[#1D9E75]" aria-hidden />
                    <h3 className="text-sm font-semibold text-[#1a3a32]">{t(point.title, locale)}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                      {t(point.body, locale)}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function YoTeacherSignalPreview({ locale }: { locale: YoLocale }) {
  return (
    <section
      aria-labelledby="yo-teacher-signal-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-5 shadow-[0_8px_24px_rgba(15,58,52,0.07)] sm:p-8">
        <div aria-hidden className="absolute -right-16 -top-16 size-52 rounded-full bg-[#F4B400]/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="ds-label text-[#8a5a17]">
              {locale === "fr" ? "Connexion professeur" : "Teacher connection"}
            </span>
            <h2 id="yo-teacher-signal-title" className="mt-2 text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-[1.75rem]">
              {locale === "fr"
                ? "Ce que ton professeur pourra voir bientôt"
                : "What your teacher will soon be able to see"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#1a3a32]/78 sm:text-[0.95rem]">
              {locale === "fr"
                ? "YoPratiqo ne sert pas seulement à apprendre en autonomie. Il aide aussi ton professeur Pratiqo à savoir quoi pratiquer avec toi."
                : "YoPratiqo is not only for self-paced study. It also helps your Pratiqo teacher know what to practice with you."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEACHER_SIGNALS.map((signal, index) => (
              <div key={signal.fr} className="flex items-center gap-3 rounded-2xl bg-white/78 p-3 ring-1 ring-white/80">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#0F6E56] text-white">
                  {index === 0 ? <BookOpenCheck className="size-4" aria-hidden /> : <GraduationCap className="size-4" aria-hidden />}
                </span>
                <span className="text-sm font-semibold text-[#1a3a32]">{t(signal, locale)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
