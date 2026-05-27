/**
 * YoVocabularyTable — bilingual vocabulary list (Spanish / French).
 *
 * Pure presentational component (no client state). Renders an accessible
 * description list where each row pairs the target term (lang="es") with
 * its French translation. Used by `YoIntroSectionPanel` for the closing
 * vocab box of each section, and for "phrases pratiques" inline blocks.
 */

import type { YoVocabularyItem } from "@/lib/yo/types";

export interface YoVocabularyTableProps {
  items: YoVocabularyItem[];
  /** Optional heading rendered above the list (e.g. "Vocabulaire"). */
  heading?: string;
  /** Visual variant. `cream` is the default; `plain` removes the bg/border. */
  variant?: "cream" | "plain";
  /** Optional id forwarded for aria-labelledby relationships. */
  id?: string;
}

export function YoVocabularyTable({
  items,
  heading,
  variant = "cream",
  id,
}: YoVocabularyTableProps) {
  if (items.length === 0) {
    return null;
  }
  const headingId = id ? `${id}-heading` : undefined;
  const containerClass =
    variant === "plain"
      ? "flex flex-col gap-1"
      : "rounded-2xl bg-[var(--color-base-cream)] p-4 ring-1 ring-teal-100/70";

  return (
    <div className={containerClass} aria-labelledby={headingId}>
      {heading ? (
        <p
          id={headingId}
          className="ds-label mb-2 text-teal-700/90"
        >
          {heading}
        </p>
      ) : null}
      <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {items.map((item) => (
          <div
            key={`${item.target}-${item.translation}`}
            className="flex flex-col gap-0 sm:contents"
          >
            <dt
              className="text-[0.95rem] font-medium text-[#1a3a32]"
              lang="es"
            >
              {item.target}
            </dt>
            <dd className="text-sm text-[var(--color-text-secondary)] sm:text-[0.95rem]">
              {item.translation}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
