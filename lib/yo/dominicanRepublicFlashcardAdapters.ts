/**
 * Tiny structural adapters that map each Dominican Republic module's
 * native flashcard shape into the canonical `YoFlashcard` shape used
 * by the RD-intro flashcard preview component.
 *
 * Why this file exists:
 *   - `dominicanRepublicHotelAirport.ts` and `dominicanRepublicFood
 *     Culture.ts` were authored before the shared `YoFlashcard`
 *     contract existed. Their `Dom2Flashcard` / `Dom3Flashcard`
 *     shapes are still consumed by the existing tests/components.
 *   - To upgrade Module 2 / Module 3 flashcards to the same premium
 *     carousel UX as the RD intro, we need to feed them through
 *     `YoFlashcardPreview`, which expects `YoFlashcard[]`.
 *   - Keeping the conversion in a dedicated module avoids touching
 *     the existing data files (which would risk regressions in
 *     unrelated tests) and gives us a single place to evolve the
 *     mapping if the flashcard contract changes.
 *
 * The adapters are pure: same input ⇒ same output, no I/O, no time
 * dependency. They produce stable card ids derived from the source
 * id so the flashcard rating + index state stays consistent across
 * server renders.
 */

import { lstr } from "@/lib/yo/localize";
import type { YoFlashcard, YoLocalizedString } from "@/lib/yo/types";
import type { Dom2Flashcard } from "@/lib/yo/dominicanRepublicHotelAirport";
import type { Dom3Flashcard } from "@/lib/yo/dominicanRepublicFoodCulture";

/** Visual treatment shared with the RD-intro flashcards. */
const RD_FLASHCARD_VISUAL_HINT = "tropical-flashcard" as const;

/**
 * Build a localized "back" string from FR + EN halves. Phase-1 RD
 * modules don't carry an authored Spanish back; we fall back to the
 * FR copy so `t(value, "es")` still yields something readable. When
 * the Module 3 source already has a trilingual back (`YoLocalizedString`),
 * we forward it as-is.
 */
function frEnToLocalized(fr: string, en?: string): YoLocalizedString {
  return lstr(fr, en ?? fr);
}

/**
 * Module 2 flashcards → canonical `YoFlashcard[]`.
 *
 * Sources `Dom2Flashcard.tag` (already a `YoLocalizedString`)
 * directly so the eyebrow chip on the carousel stays bilingual.
 * `hintFr`/`hintEn` collapse into `YoFlashcard.hint`.
 */
export function module2FlashcardsToYo(
  cards: readonly Dom2Flashcard[],
): YoFlashcard[] {
  return cards.map((card) => ({
    id: `m2-${card.id}`,
    front: card.front,
    back: frEnToLocalized(card.backFr, card.backEn),
    hint: card.hintFr ? frEnToLocalized(card.hintFr, card.hintEn) : undefined,
    tag: card.tag,
    visualHint: RD_FLASHCARD_VISUAL_HINT,
    imagePath: null,
  }));
}

/**
 * Module 3 flashcards → canonical `YoFlashcard[]`.
 *
 * Module 3's native `back` is already a `YoLocalizedString`, so we
 * forward it verbatim. `Dom3Flashcard.category` is reused as the
 * eyebrow tag since Module 3 has no separate `tag` slot.
 */
export function module3FlashcardsToYo(
  cards: readonly Dom3Flashcard[],
): YoFlashcard[] {
  return cards.map((card) => ({
    id: `m3-${card.id}`,
    front: card.front,
    back: card.back,
    tag: card.category,
    visualHint: RD_FLASHCARD_VISUAL_HINT,
    imagePath: null,
  }));
}
