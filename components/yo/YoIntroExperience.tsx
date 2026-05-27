"use client";

/**
 * YoIntroExperience — client orchestrator for the Yo Pratiqo Voyage Intro.
 *
 * Owns the "which detailed section is open" state and renders:
 *   1. The intro progress / value-prop strip.
 *   2. The four intro cards (`YoLessonCard`), each card's CTA is a real
 *      <button> that toggles its matching detailed section.
 *   3. The detailed section panel (`YoIntroSectionPanel`) when one is open.
 *   4. The pocket Dominican Republic dictionary (always visible).
 *   5. The flashcard deck preview (12 cards).
 *   6. The quiz preview (5 questions).
 *
 * No Supabase, no Stripe, no payment math, no migrations, no real audio.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type {
  YoDominicanExpression,
  YoFlashcard,
  YoIntroDetailedSection,
  YoIntroProgressStats,
  YoLessonCard as YoLessonCardData,
  YoQuizQuestion,
} from "@/lib/yo/types";
import { YoLessonCard } from "@/components/yo/YoLessonCard";
import { YoIntroSectionPanel } from "@/components/yo/YoIntroSectionPanel";
import { YoDominicanDictionary } from "@/components/yo/YoDominicanDictionary";
import { YoFlashcardPreview } from "@/components/yo/YoFlashcardPreview";
import { YoQuizPreview } from "@/components/yo/YoQuizPreview";

export interface YoIntroExperienceProps {
  introCards: YoLessonCardData[];
  detailedSections: YoIntroDetailedSection[];
  dominicanDictionary: YoDominicanExpression[];
  flashcardDeck: YoFlashcard[];
  quizQuestions: YoQuizQuestion[];
  introProgress: YoIntroProgressStats;
  /** Optional human label e.g. "République dominicaine" rendered above the strip. */
  destinationLabel?: string;
}

export function YoIntroExperience({
  introCards,
  detailedSections,
  dominicanDictionary,
  flashcardDeck,
  quizQuestions,
  introProgress,
  destinationLabel,
}: YoIntroExperienceProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Quick lookup so the orchestrator never re-iterates the sections array.
  const sectionsById = useMemo(() => {
    const map = new Map<string, YoIntroDetailedSection>();
    for (const section of detailedSections) {
      map.set(section.id, section);
    }
    return map;
  }, [detailedSections]);

  const handleSelect = useCallback(
    (cardId: string) => {
      setSelectedCardId((current) => (current === cardId ? null : cardId));
    },
    [],
  );

  const handleClose = useCallback(() => {
    setSelectedCardId(null);
  }, []);

  const selectedSection = selectedCardId
    ? sectionsById.get(selectedCardId) ?? null
    : null;

  // Gentle auto-scroll so the freshly opened panel is visible on mobile too.
  useEffect(() => {
    if (selectedSection && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSection]);

  return (
    <>
      <IntroProgressStrip
        progress={introProgress}
        destinationLabel={destinationLabel}
      />

      <section
        aria-labelledby="yo-intro-title"
        className="mx-auto w-full max-w-5xl px-5 pt-8 sm:px-8 sm:pt-10"
      >
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2
            id="yo-intro-title"
            className="text-xl font-medium tracking-tight text-[#1a3a32] sm:text-2xl"
          >
            Intro · {destinationLabel ?? "Espagnol A1"}
          </h2>
          <p className="hidden text-sm text-[var(--color-text-secondary)] sm:block">
            4 mini-modules · ~12 min
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
          {introCards.map((card) => (
            <YoLessonCard
              key={card.id}
              card={card}
              onSelect={handleSelect}
              isSelected={selectedCardId === card.id}
              panelId={panelIdFor(card.id)}
            />
          ))}
        </div>
      </section>

      {selectedSection ? (
        <div
          ref={panelRef}
          className="mx-auto w-full max-w-5xl px-5 pt-6 sm:px-8 sm:pt-8"
        >
          <YoIntroSectionPanel
            section={selectedSection}
            panelId={panelIdFor(selectedSection.id)}
            onClose={handleClose}
          />
        </div>
      ) : (
        <div className="mx-auto mt-6 hidden w-full max-w-5xl px-5 sm:block sm:px-8">
          <p className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-teal-200 bg-white/60 px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            <ChevronDown
              aria-hidden
              className="size-4 text-teal-700"
            />
            Choisis une section au-dessus pour explorer la leçon.
          </p>
        </div>
      )}

      <YoDominicanDictionary expressions={dominicanDictionary} />

      <YoFlashcardPreview cards={flashcardDeck} />

      <YoQuizPreview questions={quizQuestions} />
    </>
  );
}

function panelIdFor(cardId: string) {
  return `yo-intro-panel-${cardId}`;
}

interface IntroProgressStripProps {
  progress: YoIntroProgressStats;
  destinationLabel?: string;
}

function IntroProgressStrip({
  progress,
  destinationLabel,
}: IntroProgressStripProps) {
  return (
    <section
      aria-labelledby="yo-progress-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div
        className="relative overflow-hidden rounded-3xl border border-teal-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-7"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #ffffff 0%, #f3f9f7 50%, #e7f6f3 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-teal-100/50 blur-3xl"
        />

        <div className="relative grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-8">
          <div>
            <span className="ds-label text-teal-700/90">
              Intro gratuite
              {destinationLabel ? ` · ${destinationLabel}` : ""}
            </span>
            <h2
              id="yo-progress-title"
              className="mt-2 text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-[1.6rem]"
            >
              {progress.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.95rem]">
              {progress.description}
            </p>
          </div>

          <ul role="list" className="grid grid-cols-2 gap-3 sm:gap-4">
            {progress.stats.map((stat) => (
              <li
                key={stat.id}
                className="flex flex-col gap-0.5 rounded-2xl bg-white px-4 py-3 ring-1 ring-teal-100"
              >
                <span className="text-2xl font-semibold tracking-tight text-[#1a3a32] sm:text-3xl">
                  {stat.value}
                </span>
                <span className="text-xs leading-snug text-[var(--color-text-secondary)] sm:text-sm">
                  {stat.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
