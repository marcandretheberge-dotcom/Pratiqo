"use client";

/**
 * YoFlashcardPreview — interactive flashcard demo.
 *
 * Client component (rates the card → updates a small UI feedback).
 * Phase 1: NO real spaced-repetition state, NO Supabase writes, NO timers.
 * The three buttons map to YoFlashcardQuality values (0/3/5) so the same
 * handler shape can later persist to public.yo_flashcard_reviews under
 * simplified SM-2 in Phase 2.
 */

import { useCallback, useState } from "react";
import { RotateCw, Sparkles } from "lucide-react";
import type { YoFlashcard, YoFlashcardQuality } from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import {
  YoExpressionLocaleBadge,
  YoFlashcardTropicalBg,
} from "@/components/yo/YoVisuals";

export interface YoFlashcardPreviewProps {
  card: YoFlashcard;
}

const FEEDBACK: Record<YoFlashcardQuality, string> = {
  0: "Cette carte reviendra bientôt.",
  3: "Bon effort.",
  5: "Maîtrisé pour aujourd’hui.",
};

const TONE: Record<YoFlashcardQuality, string> = {
  0: "bg-[#fdecec] text-[#a23a3a] ring-[#f6c8c8]",
  3: "bg-teal-50 text-teal-800 ring-teal-100",
  5: "bg-[#e6f4ec] text-[#1f6a45] ring-[#bfe1cd]",
};

export function YoFlashcardPreview({ card }: YoFlashcardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [lastRating, setLastRating] = useState<YoFlashcardQuality | null>(null);

  const handleFlip = useCallback(() => {
    setIsFlipped((value) => !value);
  }, []);

  const handleRate = useCallback((quality: YoFlashcardQuality) => {
    setLastRating(quality);
    // Reveal the back so the learner sees what they just rated.
    setIsFlipped(true);
  }, []);

  const handleReset = useCallback(() => {
    setIsFlipped(false);
    setLastRating(null);
  }, []);

  return (
    <section
      aria-labelledby="yo-flash-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2
          id="yo-flash-title"
          className="text-xl font-medium tracking-tight text-[#1a3a32] sm:text-2xl"
        >
          Flashcards intelligentes
        </h2>
        <p className="hidden text-sm text-[var(--color-text-secondary)] sm:block">
          Démo · révision SM-2 dans le programme complet
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_280px]">
        <button
          type="button"
          onClick={handleFlip}
          aria-pressed={isFlipped}
          aria-label={
            isFlipped
              ? `Cacher la traduction de ${card.front}`
              : `Voir la traduction de ${card.front}`
          }
          className="group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-3xl border border-teal-100 bg-white p-6 text-left shadow-[0_1px_2px_rgba(15,58,52,0.04)] transition hover:shadow-[0_8px_24px_rgba(15,58,52,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:min-h-[240px] sm:p-8"
        >
          {card.visualHint === "tropical-flashcard" && !card.imagePath ? (
            <YoFlashcardTropicalBg />
          ) : null}

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ds-label text-teal-700/80">
                {isFlipped ? "Traduction" : "Carte"}
                {card.tag ? ` · ${card.tag}` : ""}
              </span>
              {card.isLocalExpression ? <YoExpressionLocaleBadge /> : null}
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-teal-700/70 opacity-0 transition group-hover:opacity-100">
              <RotateCw className="size-3.5" aria-hidden />
              Retourner
            </span>
          </div>

          <div className="relative z-10 flex flex-col gap-3">
            {isFlipped ? (
              <>
                <p className="text-3xl font-medium leading-tight tracking-tight text-[#1a3a32] sm:text-4xl">
                  {card.back}
                </p>
                {card.hint ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {card.hint}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p
                  className="text-3xl font-medium leading-tight tracking-tight text-[#1a3a32] sm:text-4xl"
                  lang="es"
                >
                  {card.front}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Touche la carte pour voir la traduction.
                </p>
              </>
            )}
          </div>
        </button>

        <div className="flex flex-col gap-2 rounded-3xl border border-teal-100 bg-[var(--color-base-cream)] p-4 sm:p-5">
          <p className="ds-label text-teal-700/90">Comment c’était ?</p>

          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
            <RatingButton
              quality={0}
              label="Difficile"
              onRate={handleRate}
              selected={lastRating === 0}
            />
            <RatingButton
              quality={3}
              label="Correct"
              onRate={handleRate}
              selected={lastRating === 3}
            />
            <RatingButton
              quality={5}
              label="Facile"
              onRate={handleRate}
              selected={lastRating === 5}
            />
          </div>

          {lastRating !== null ? (
            <p
              role="status"
              aria-live="polite"
              className={cn(
                "mt-1 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ring-1",
                TONE[lastRating],
              )}
            >
              <Sparkles aria-hidden className="size-3.5" />
              {FEEDBACK[lastRating]}
            </p>
          ) : (
            <p className="mt-1 text-xs leading-snug text-[var(--color-text-secondary)]">
              Pas de pression : retourne la carte d’abord si tu as besoin de
              voir la réponse.
            </p>
          )}

          {lastRating !== null ? (
            <button
              type="button"
              onClick={handleReset}
              className="mt-2 self-start text-xs font-medium text-teal-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              Réessayer
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

interface RatingButtonProps {
  quality: YoFlashcardQuality;
  label: string;
  onRate: (quality: YoFlashcardQuality) => void;
  selected: boolean;
}

function RatingButton({ quality, label, onRate, selected }: RatingButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onRate(quality)}
      aria-pressed={selected}
      className={cn(
        "rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
        selected
          ? "bg-teal-700 text-white shadow-sm"
          : "bg-white text-teal-800 ring-1 ring-teal-100 hover:bg-teal-50",
      )}
    >
      {label}
    </button>
  );
}
