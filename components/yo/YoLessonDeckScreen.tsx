/**
 * YoLessonDeckScreen
 *
 * Visual frame for one screen inside the lesson deck. Wraps the
 * server-rendered lesson content with a consistent eyebrow +
 * title + companion coach + body, then drops the actual content
 * underneath. Used by `<YoLessonDeck />` — consumers of the deck
 * normally do not import this directly.
 *
 * Layout
 * ------
 *   ┌─ rounded card ───────────────────────────────────────────┐
 *   │ EYEBROW                                                  │
 *   │ Big editorial serif title              [companion coach] │
 *   │ Body line (optional)                                     │
 *   │ ─────────────────────────────────────────────────────── │
 *   │                                                          │
 *   │ <screen.content>                                         │
 *   │                                                          │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure server component. No client hooks, no API calls, no
 *     persistence, no payment library, no Supabase write, no
 *     quiz data.
 */

import { cn } from "@/lib/utils";
import { YoLessonCompanionCoach } from "@/components/yo/YoLessonCompanionCoach";
import type { YoLessonDeckScreen as YoLessonDeckScreenModel } from "@/lib/yo/lessonDeckTypes";
import type { YoLocale } from "@/lib/yo/types";

export type YoLessonDeckScreenProps = {
  screen: YoLessonDeckScreenModel;
  locale: YoLocale;
  className?: string;
};

export function YoLessonDeckScreen({
  screen,
  locale,
  className,
}: YoLessonDeckScreenProps): React.JSX.Element {
  return (
    <article
      data-testid="yo-lesson-deck-screen"
      data-yo-lesson-deck-screen-id={screen.id}
      data-yo-lesson-deck-screen-kind={screen.kind}
      className={cn(
        "flex w-full flex-col gap-4 rounded-[2rem] border border-[#E7DFCF] bg-white p-5 shadow-[0_18px_46px_rgba(23,38,66,0.07)] sm:p-6",
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <div className="flex flex-1 flex-col gap-1">
          {screen.eyebrow ? (
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#13A085]">
              {screen.eyebrow}
            </p>
          ) : null}
          <h2 className="font-[var(--yo-app-display)] text-[22px] font-semibold leading-tight tracking-tight text-[#172642] sm:text-2xl">
            {screen.title}
          </h2>
          {screen.body ? (
            <p className="text-sm leading-relaxed text-[#566073]">
              {screen.body}
            </p>
          ) : null}
        </div>
        {/* Companion sits to the right on sm+ so the screen reads
            like a phone-app onboarding card; on mobile it stacks
            below the title instead via the wrapping flex column
            of the YoLessonCompanionCoach helper-text. */}
        <div className="hidden sm:block">
          <YoLessonCompanionCoach
            locale={locale}
            state={screen.companionState}
            size="sm"
          />
        </div>
      </header>

      {screen.helperText ? (
        <YoLessonCompanionCoach
          locale={locale}
          state={screen.companionState}
          helperText={screen.helperText}
          size="sm"
          className="sm:hidden"
        />
      ) : null}

      <div data-yo-lesson-deck-screen-content="true" className="min-w-0">
        {screen.content}
      </div>
    </article>
  );
}

export default YoLessonDeckScreen;
