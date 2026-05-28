/**
 * YoLessonCard — single card inside a YoPratiqo Voyage-section lesson.
 *
 * Server component. Handles three card kinds:
 *   - "text"    text + CTA  (intro cards 1-3)
 *   - "phrases" bilingual phrase rows + optional CTA  (intro card 4)
 *   - "media"   future audio/video-led cards (renders text fallback for now)
 *
 * When `onSelect` is passed (Yo intro experience), the CTA renders as a
 * real `<button>` with `aria-expanded` / `aria-controls` so screen readers
 * announce the disclosure relationship with the detailed section panel.
 * When `onSelect` is absent the CTA remains a passive link (legacy / static
 * usage). No layout difference between the two modes.
 *
 * If `card.visualHint` is set, a code-based decorative band is rendered at
 * the top of the card via `YoCardVisual`. Phase 2 will prefer `card.imagePath`
 * (real image) over the placeholder when set.
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
import type {
  YoLessonCard as YoLessonCardData,
  YoLocale,
} from "@/lib/yo/types";
import { YoImageVisual } from "@/components/yo/YoImageVisual";
import { t } from "@/lib/yo/localize";
import { cn } from "@/lib/utils";

export interface YoLessonCardProps {
  card: YoLessonCardData;
  locale: YoLocale;
  /**
   * When provided, the bottom CTA becomes an interactive button that
   * triggers progressive disclosure of a detailed section panel. The
   * orchestrator (YoIntroExperience) owns the selected state and passes
   * `isSelected` back so this card can render aria-expanded properly.
   */
  onSelect?: (cardId: string) => void;
  /** Whether the matching detailed section is currently open. */
  isSelected?: boolean;
  /**
   * Id of the panel element this card's CTA controls. Required when
   * `onSelect` is provided for proper aria-controls wiring.
   */
  panelId?: string;
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

export function YoLessonCard({
  card,
  locale,
  onSelect,
  isSelected = false,
  panelId,
}: YoLessonCardProps) {
  const Icon: LucideIcon = card.iconHint ? ICONS[card.iconHint] : Compass;
  const hasVisual = Boolean(card.visualHint || card.imagePath);
  const isInteractive = Boolean(onSelect);

  const title = t(card.title, locale);
  const description = card.description ? t(card.description, locale) : null;
  const ctaLabel = card.ctaLabel ? t(card.ctaLabel, locale) : null;

  return (
    <article
      className={cn(
        "ds-card group flex h-full flex-col overflow-hidden shadow-[0_1px_2px_rgba(15,58,52,0.04)] transition",
        isSelected
          ? "border-teal-300 shadow-[0_8px_24px_rgba(15,58,52,0.10)]"
          : "hover:shadow-[0_8px_24px_rgba(15,58,52,0.07)]",
      )}
      aria-labelledby={`yo-card-${card.id}-title`}
    >
      {hasVisual ? (
        <div className="relative border-b border-teal-100/70 p-3 pb-0">
          <YoImageVisual
            imagePath={card.imagePath}
            alt={card.imageAlt ?? card.title}
            locale={locale}
            fallbackKind={card.visualHint}
            variant="card"
            className="rounded-2xl shadow-none"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "flex size-10 items-center justify-center rounded-xl transition",
              isSelected
                ? "bg-teal-600 text-white"
                : "bg-teal-50 text-teal-700",
            )}
          >
            <Icon className="size-5" />
          </span>
          <h3
            id={`yo-card-${card.id}-title`}
            className="text-base font-medium leading-tight text-[#1a3a32] sm:text-lg"
          >
            {title}
          </h3>
        </div>

        {description ? (
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.95rem]">
            {description}
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
                  {t(row.translation, locale)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {ctaLabel ? (
          <div className="mt-auto pt-1">
            {isInteractive ? (
              <button
                type="button"
                onClick={() => onSelect?.(card.id)}
                aria-expanded={isSelected}
                aria-controls={panelId}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:text-[0.95rem]",
                  isSelected
                    ? "bg-teal-700 text-white shadow-sm hover:bg-teal-800"
                    : "bg-teal-50 text-teal-800 ring-1 ring-teal-100 hover:bg-teal-100",
                )}
              >
                {ctaLabel}
                <span aria-hidden>{isSelected ? "↑" : "→"}</span>
              </button>
            ) : (
              <a
                href={card.ctaHref ?? "#"}
                className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 transition hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                {ctaLabel}
                <span aria-hidden>→</span>
              </a>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
