/**
 * YoLessonCard — single card inside a Yo Pratiqo Voyage lesson.
 *
 * Server component. Handles three card kinds:
 *   - "text"    text + CTA  (intro cards 1-3)
 *   - "phrases" bilingual phrase rows + optional CTA  (intro card 4)
 *   - "media"   future audio/video-led cards (renders text fallback for now)
 *
 * Icon hint maps to a lucide-react glyph for visual variety; falls back to
 * Compass when no hint is provided.
 */

import {
  Book,
  Compass,
  Languages,
  Map as MapIcon,
  MessageCircle,
  Music,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { YoLessonCard as YoLessonCardData } from "@/lib/yo/types";

export interface YoLessonCardProps {
  card: YoLessonCardData;
}

const ICONS: Record<
  NonNullable<YoLessonCardData["iconHint"]>,
  LucideIcon
> = {
  map: MapIcon,
  book: Book,
  utensils: Utensils,
  music: Music,
  languages: Languages,
  "message-circle": MessageCircle,
  compass: Compass,
  sparkles: Sparkles,
};

export function YoLessonCard({ card }: YoLessonCardProps) {
  const Icon: LucideIcon = card.iconHint ? ICONS[card.iconHint] : Compass;

  return (
    <article
      className="ds-card flex h-full flex-col gap-4 p-5 shadow-[0_1px_2px_rgba(15,58,52,0.04)] transition hover:shadow-[0_8px_24px_rgba(15,58,52,0.07)] sm:p-6"
      aria-labelledby={`yo-card-${card.id}-title`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"
        >
          <Icon className="size-5" />
        </span>
        <h3
          id={`yo-card-${card.id}-title`}
          className="text-base font-medium leading-tight text-[#1a3a32] sm:text-lg"
        >
          {card.title}
        </h3>
      </div>

      {card.description ? (
        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.95rem]">
          {card.description}
        </p>
      ) : null}

      {card.kind === "phrases" && card.phrases && card.phrases.length > 0 ? (
        <ul
          role="list"
          className="mt-1 flex flex-col divide-y divide-teal-50 rounded-xl bg-[var(--color-base-cream)] px-1"
        >
          {card.phrases.map((row) => (
            <li
              key={`${card.id}-${row.target}`}
              className="flex flex-col gap-0.5 px-3 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <span
                className="text-[0.95rem] font-medium text-[#1a3a32]"
                lang="es"
              >
                {row.target}
              </span>
              <span className="text-sm text-[var(--color-text-secondary)]">
                {row.translation}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {card.ctaLabel ? (
        <div className="mt-auto pt-1">
          <a
            href={card.ctaHref ?? "#"}
            className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 transition hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            {card.ctaLabel}
            <span aria-hidden>→</span>
          </a>
        </div>
      ) : null}
    </article>
  );
}
