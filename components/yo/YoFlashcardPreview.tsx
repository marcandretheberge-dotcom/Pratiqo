"use client";

/**
 * YoFlashcardPreview — interactive flashcard deck.
 *
 * Client component. Phase 1: NO real spaced-repetition state, NO Supabase
 * writes, NO timers. The three rating buttons map to YoFlashcardQuality
 * values (0/3/5) so the same handler shape can later persist to
 * public.yo_flashcard_reviews under simplified SM-2 in Phase 2.
 *
 * Flow:
 *   1. Show card N / total.
 *   2. User flips → reveal back + hint.
 *   3. User rates Difficile / Correct / Facile → feedback.
 *   4. "Carte suivante" advances; at the end show completion + Recommencer.
 *
 * Each card individually carries `visualHint` / `isLocalExpression` so its
 * background motif and badge stay aligned with the card content.
 */

import { useCallback, useState } from "react";
import { CheckCircle2, RotateCw, Sparkles } from "lucide-react";
import type { YoFlashcard, YoFlashcardQuality } from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import {
  YoExpressionLocaleBadge,
  YoFlashcardTropicalBg,
} from "@/components/yo/YoVisuals";

export interface YoFlashcardPreviewProps {
  cards: YoFlashcard[];
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

type DeckState =
  | { mode: "card"; isFlipped: boolean; lastRating: YoFlashcardQuality | null }
  | { mode: "complete" };

export function YoFlashcardPreview({ cards }: YoFlashcardPreviewProps) {
  const total = cards.length;
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<DeckState>({
    mode: "card",
    isFlipped: false,
    lastRating: null,
  });

  const handleFlip = useCallback(() => {
    setState((prev) => {
      if (prev.mode !== "card") return prev;
      return { ...prev, isFlipped: !prev.isFlipped };
    });
  }, []);

  const handleRate = useCallback((quality: YoFlashcardQuality) => {
    setState((prev) => {
      if (prev.mode !== "card") return prev;
      return { mode: "card", isFlipped: true, lastRating: quality };
    });
  }, []);

  const handleNext = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) {
        setState({ mode: "complete" });
        return i;
      }
      setState({ mode: "card", isFlipped: false, lastRating: null });
      return i + 1;
    });
  }, [total]);

  const handleResetCurrent = useCallback(() => {
    setState({ mode: "card", isFlipped: false, lastRating: null });
  }, []);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setState({ mode: "card", isFlipped: false, lastRating: null });
  }, []);

  if (total === 0) {
    return null;
  }

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

      {state.mode === "complete" ? (
        <CompletionPanel total={total} onRestart={handleRestart} />
      ) : (
        <DeckCard
          card={cards[index]!}
          index={index}
          total={total}
          state={state}
          onFlip={handleFlip}
          onRate={handleRate}
          onNext={handleNext}
          onResetCurrent={handleResetCurrent}
        />
      )}
    </section>
  );
}

interface DeckCardProps {
  card: YoFlashcard;
  index: number;
  total: number;
  state: Extract<DeckState, { mode: "card" }>;
  onFlip: () => void;
  onRate: (quality: YoFlashcardQuality) => void;
  onNext: () => void;
  onResetCurrent: () => void;
}

function DeckCard({
  card,
  index,
  total,
  state,
  onFlip,
  onRate,
  onNext,
  onResetCurrent,
}: DeckCardProps) {
  const isLast = index === total - 1;
  const hasTropicalBg =
    card.visualHint === "tropical-flashcard" && !card.imagePath;

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p
            className="text-xs font-medium uppercase tracking-[0.14em] text-teal-700/80"
            aria-live="polite"
          >
            Carte {index + 1} / {total}
          </p>
          <ProgressBar current={index + 1} total={total} />
        </div>

        <button
          type="button"
          onClick={onFlip}
          aria-pressed={state.isFlipped}
          aria-label={
            state.isFlipped
              ? `Cacher la traduction de ${card.front}`
              : `Voir la traduction de ${card.front}`
          }
          className="group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-3xl border border-teal-100 bg-white p-6 text-left shadow-[0_1px_2px_rgba(15,58,52,0.04)] transition hover:shadow-[0_8px_24px_rgba(15,58,52,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:min-h-[240px] sm:p-8"
        >
          {hasTropicalBg ? <YoFlashcardTropicalBg /> : null}

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ds-label text-teal-700/80">
                {state.isFlipped ? "Traduction" : "Carte"}
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
            {state.isFlipped ? (
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
      </div>

      <div className="flex flex-col gap-2 rounded-3xl border border-teal-100 bg-[var(--color-base-cream)] p-4 sm:p-5">
        <p className="ds-label text-teal-700/90">Comment c’était ?</p>

        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          <RatingButton
            quality={0}
            label="Difficile"
            onRate={onRate}
            selected={state.lastRating === 0}
          />
          <RatingButton
            quality={3}
            label="Correct"
            onRate={onRate}
            selected={state.lastRating === 3}
          />
          <RatingButton
            quality={5}
            label="Facile"
            onRate={onRate}
            selected={state.lastRating === 5}
          />
        </div>

        {state.lastRating !== null ? (
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "mt-1 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ring-1",
              TONE[state.lastRating],
            )}
          >
            <Sparkles aria-hidden className="size-3.5" />
            {FEEDBACK[state.lastRating]}
          </p>
        ) : (
          <p className="mt-1 text-xs leading-snug text-[var(--color-text-secondary)]">
            Pas de pression : retourne la carte d’abord si tu as besoin de
            voir la réponse.
          </p>
        )}

        <div className="mt-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onNext}
            disabled={state.lastRating === null}
            className={cn(
              "ds-btn-primary inline-flex w-full items-center justify-center gap-2 text-center text-sm transition sm:text-base",
              state.lastRating === null && "cursor-not-allowed opacity-50",
            )}
          >
            {isLast ? "Terminer" : "Carte suivante"}
            <span aria-hidden>→</span>
          </button>
          {state.lastRating !== null ? (
            <button
              type="button"
              onClick={onResetCurrent}
              className="self-center text-xs font-medium text-teal-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              Réessayer cette carte
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface ProgressBarProps {
  current: number;
  total: number;
}

function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.round((current / total) * 100);
  return (
    <div
      className="h-1.5 w-32 overflow-hidden rounded-full bg-teal-50 ring-1 ring-teal-100 sm:w-44"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Progression flashcards : ${current} sur ${total}`}
    >
      <div
        className="h-full rounded-full bg-teal-500 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
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

interface CompletionPanelProps {
  total: number;
  onRestart: () => void;
}

function CompletionPanel({ total, onRestart }: CompletionPanelProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-start gap-4 rounded-3xl border border-teal-100 bg-gradient-to-br from-[#e6f4ec] via-white to-[var(--color-base-cream)] p-6 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-8"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
        <CheckCircle2 aria-hidden className="size-4 text-teal-700" />
        {total} cartes vues
      </span>
      <p className="text-xl font-medium text-[#1a3a32] sm:text-2xl">
        Tu as terminé cette mini-révision.
      </p>
      <p className="max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
        Dans le programme complet, l’algorithme SM-2 te ramène les cartes
        difficiles plus souvent et espace les cartes faciles. Tu peux
        recommencer cette démo autant de fois que tu veux.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="ds-btn-primary inline-flex items-center justify-center gap-2 text-center text-sm sm:text-base"
      >
        Recommencer
        <span aria-hidden>↺</span>
      </button>
    </div>
  );
}
