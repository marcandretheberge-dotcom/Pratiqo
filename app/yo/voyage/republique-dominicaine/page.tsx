/**
 * Yo Pratiqo Voyage — Espagnol République dominicaine A1
 *
 * Phase 1 polished UI prototype. The page itself is a Server Component
 * rendered statically (`force-static`). The interactive learning core —
 * cards + detailed section panel + dictionary + flashcard deck + quiz —
 * lives inside `YoIntroExperience`, a single Client Component that owns
 * all progressive-disclosure state.
 *
 * No Supabase calls, no Stripe wiring, no payment math, no checkout, no
 * marketplace coupling. Renders exclusively from the hardcoded
 * `dominicanRepublicA1` data file.
 */

import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/site";
import {
  dominicanRepublicA1,
  dominicanRepublicA1PriceLabel,
} from "@/lib/yo/dominicanRepublicA1";
import { YoVoyageHero } from "@/components/yo/YoVoyageHero";
import { YoLessonPath } from "@/components/yo/YoLessonPath";
import { YoIntroExperience } from "@/components/yo/YoIntroExperience";
import { YoUnlockCard } from "@/components/yo/YoUnlockCard";
import { YoFeatureStrip } from "@/components/yo/YoFeatureStrip";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title:
    "Yo Pratiqo Voyage — Espagnol pratique pour la République dominicaine",
  description:
    "Apprends à vraiment parler sur place avec culture, expressions locales et missions réelles. Niveau A1 débutant, $24,99 CAD, accès à vie.",
  alternates: {
    canonical: `${SITE_URL}/yo/voyage/republique-dominicaine`,
  },
  openGraph: {
    title: "Yo Pratiqo Voyage — République dominicaine A1",
    description:
      "Espagnol pratique, culture dominicaine et expressions locales. $24,99 CAD, accès à vie.",
    type: "website",
    url: `${SITE_URL}/yo/voyage/republique-dominicaine`,
    locale: "fr_CA",
  },
  // Phase 1 prototype — keep out of search indexes until launch copy/legal pages exist.
  robots: { index: false, follow: false },
};

export default function YoVoyageRepubliqueDominicainePage() {
  const {
    module,
    lessonPath,
    detailedSections,
    dominicanDictionary,
    flashcardDeck,
    quizQuestions,
    introProgress,
    unlockFeatures,
    bottomFeatures,
  } = dominicanRepublicA1;

  const introLesson = module.lessons.find((lesson) => lesson.position === 1);
  const introCards = introLesson?.cards ?? [];

  return (
    <div className="bg-[#FAFCFB]">
      <main id="main-content" className="flex flex-col pb-20">
        <YoVoyageHero module={module} />

        <YoLessonPath steps={lessonPath} activeHref="#yo-progress-title" />

        <YoIntroExperience
          introCards={introCards}
          detailedSections={detailedSections}
          dominicanDictionary={dominicanDictionary}
          flashcardDeck={flashcardDeck}
          quizQuestions={quizQuestions}
          introProgress={introProgress}
          destinationLabel={module.destinationLabelFr}
        />

        <YoUnlockCard
          features={unlockFeatures}
          priceLabel={dominicanRepublicA1PriceLabel}
        />

        <YoFeatureStrip features={bottomFeatures} />

        <section
          aria-labelledby="yo-final-cta-title"
          className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
        >
          <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-700 via-teal-600 to-teal-500 p-7 text-white shadow-[0_8px_24px_rgba(15,58,52,0.18)] sm:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-3xl"
            />
            <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div className="flex flex-col gap-3">
                <span className="ds-label text-white/80">
                  Prêt pour le terrain ?
                </span>
                <h2
                  id="yo-final-cta-title"
                  className="text-2xl font-medium tracking-tight sm:text-3xl"
                >
                  Prêt pour ta première vraie conversation ?
                </h2>
                <p className="max-w-xl text-sm leading-relaxed text-white/90 sm:text-[0.95rem]">
                  Commence gratuitement l’intro, puis débloque le parcours
                  complet pour arriver en République dominicaine avec confiance.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                <a
                  href="#yo-progress-title"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-teal-800 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-700 sm:text-base"
                >
                  Commencer l’intro
                  <span aria-hidden>→</span>
                </a>
                <p className="text-xs text-white/80 lg:text-right">
                  L’intro est offerte · paiement unique pour le reste
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
