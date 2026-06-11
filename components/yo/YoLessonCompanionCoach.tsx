/**
 * YoLessonCompanionCoach
 *
 * Small inline companion + helper-text bubble used inside lesson
 * deck screens to give the learner a "where am I, what do I do"
 * cue without taking over the screen. Rendered next to the
 * screen title in the deck-screen frame.
 *
 * The bubble is decorative: the visible label of each screen
 * carries the actual instruction, so the companion image
 * receives `alt=""` to avoid double-announcing to screen
 * readers, and the helper bubble is rendered as a quoted
 * paragraph rather than a heading.
 *
 * What this component does NOT do
 * -------------------------------
 *   • It does NOT generate AI tutoring text. The `helperText`
 *     prop is a static, locale-resolved string built by the page.
 *   • It does NOT animate or sound. No audio is played.
 *   • It does NOT call any API.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure server component. No client hooks, no API calls, no
 *     persistence, no payment library, no Supabase write, no
 *     quiz data, no AI summary, no analytics.
 */

import { cn } from "@/lib/utils";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { CompanionVisualState } from "@/lib/companion/companionVisuals";
import type { YoLocale } from "@/lib/yo/types";

export type YoLessonCompanionCoachSize = "sm" | "md";

export type YoLessonCompanionCoachProps = {
  locale: YoLocale;
  state: CompanionVisualState;
  /**
   * Optional short helper sentence rendered as a "speech bubble"
   * next to the companion. Keeps the surface honest: only the
   * sentence the page passed in ever appears here.
   */
  helperText?: string;
  size?: YoLessonCompanionCoachSize;
  className?: string;
};

export function YoLessonCompanionCoach({
  locale,
  state,
  helperText,
  size = "sm",
  className,
}: YoLessonCompanionCoachProps): React.JSX.Element {
  return (
    <div
      data-testid="yo-lesson-companion-coach"
      data-yo-lesson-companion-state={state}
      className={cn("flex items-start gap-3", className)}
    >
      <CompanionAvatar
        visualId="travel"
        state={state}
        locale={locale}
        size={size}
        compact
      />
      {helperText ? (
        <p className="flex-1 rounded-2xl border border-[#E7DFCF] bg-[#FBF7EE] px-3 py-2 text-xs leading-relaxed text-[#566073] sm:text-sm">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default YoLessonCompanionCoach;
