"use client";

/**
 * YoCoachPanel — YoPratiqo Coach MVP.
 *
 * Product positioning:
 *   - "YoPratiqo Coach" is the AI-feeling layer of YoPratiqo. It reacts to
 *     learner difficulty and recommends what to practice next.
 *   - It does NOT pretend to replace a teacher; a bridge CTA always
 *     points the learner to `/trouver-un-prof`.
 *
 * Architecture (Phase 1):
 *   - 100 % deterministic and 100 % local. Each option carries a
 *     pre-written FR/EN recommendation. No network call, no API key,
 *     no telemetry, no Supabase write.
 *   - Inputs / outputs are typed so the recommendation lookup can later
 *     be swapped for a SECURE server route (e.g. /api/yo/coach/suggest)
 *     reading the same `YoCoachOption[]` shape.
 *
 * Future-ready (Phase 2 sketch, intentionally not wired today):
 *   - A server route `app/api/yo/coach/suggest/route.ts` would call an
 *     LLM with the learner's signals and a server-only API key.
 *   - The key would live in `process.env.YO_COACH_LLM_KEY` and the route
 *     would early-return 503 with `{ code: "yo_coach_disabled" }` when
 *     unset. The client would call `fetch('/api/yo/coach/suggest', ...)`
 *     ONLY if `process.env.NEXT_PUBLIC_YO_COACH_ENABLED === "1"`.
 *   - We never expose any key in client code; that's a hard rule.
 *
 * Accessibility:
 *   - Radio-style buttons with `aria-pressed`.
 *   - `aria-live="polite"` on the recommendation so screen readers hear
 *     the suggestion when it appears.
 */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { GraduationCap, MessageCircle, Sparkles } from "lucide-react";
import type {
  YoCoachDifficulty,
  YoCoachOption,
  YoLocale,
} from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { t } from "@/lib/yo/localize";
import { YO_COPY } from "@/lib/yo/copy";

export interface YoCoachPanelProps {
  options: YoCoachOption[];
  locale: YoLocale;
  /**
   * Optional bridge CTA path. Defaults to `/trouver-un-prof`. Locale
   * suffix (`?lang=en`) is added by the parent page when needed.
   */
  teacherHref?: string;
}

export function YoCoachPanel({
  options,
  locale,
  teacherHref = "/trouver-un-prof",
}: YoCoachPanelProps) {
  const [pickedId, setPickedId] = useState<YoCoachDifficulty | null>(null);

  const handlePick = useCallback((id: YoCoachDifficulty) => {
    setPickedId(id);
  }, []);

  const handleReset = useCallback(() => {
    setPickedId(null);
  }, []);

  const recommendation = useMemo(() => {
    if (!pickedId) return null;
    const option = options.find((opt) => opt.id === pickedId);
    return option ? t(option.recommendation, locale) : null;
  }, [pickedId, options, locale]);

  return (
    <section
      aria-labelledby="yo-coach-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="relative overflow-hidden rounded-3xl border border-[#F4B400]/35 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_8px_24px_rgba(15,58,52,0.07)] sm:p-8">
        <div
          aria-hidden
          className="absolute -right-20 -top-20 size-56 rounded-full bg-[#F4B400]/20 blur-3xl"
        />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#7a4a00] ring-1 ring-[#F4B400]/40">
              <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
              {t(YO_COPY.coach.eyebrow, locale)}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#0F6E56]/55">
              {t(YO_COPY.coach.disclaimer, locale)}
            </span>
          </div>
          <h2
            id="yo-coach-title"
            className="text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-[1.75rem]"
          >
            {t(YO_COPY.coach.title, locale)}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-[#1a3a32]/78 sm:text-[0.95rem]">
            {t(YO_COPY.coach.body, locale)}
          </p>

          <fieldset className="flex flex-col gap-3 rounded-3xl border border-teal-100 bg-white/85 p-4 sm:p-5">
            <legend className="px-1 text-sm font-semibold text-[#1a3a32]">
              {t(YO_COPY.coach.question, locale)}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((option) => {
                const isPicked = pickedId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isPicked}
                    onClick={() => handlePick(option.id)}
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400] focus-visible:ring-offset-2 sm:text-base",
                      isPicked
                        ? "bg-[#0F6E56] text-white shadow-[0_8px_18px_rgba(15,110,86,0.18)]"
                        : "bg-white text-[#1a3a32] ring-1 ring-teal-100 hover:bg-teal-50",
                    )}
                  >
                    {t(option.label, locale)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {recommendation ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col gap-3 rounded-3xl border border-[#bfe1cd] bg-[#e6f4ec] p-4 sm:p-5"
            >
              <p className="ds-label text-[#1f6a45]">
                {t(YO_COPY.coach.recommendationHeading, locale)}
              </p>
              <p className="text-sm leading-relaxed text-[#1a3a32] sm:text-[0.95rem]">
                {recommendation}
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="self-start text-xs font-semibold text-[#0F6E56] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400] focus-visible:ring-offset-2"
              >
                {t(YO_COPY.coach.changeAnswer, locale)}
              </button>
            </div>
          ) : null}

          <div className="mt-1 flex flex-col gap-3 rounded-3xl border border-[#F4B400]/35 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <p className="flex items-start gap-2 text-sm leading-relaxed text-[#1a3a32] sm:items-center sm:text-[0.95rem]">
              <GraduationCap
                className="mt-0.5 size-4 shrink-0 text-[#0F6E56] sm:mt-0"
                aria-hidden
              />
              {t(YO_COPY.coach.bridgeText, locale)}
            </p>
            <Link
              href={teacherHref}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(15,110,86,0.18)] transition hover:bg-[#0b5b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400] focus-visible:ring-offset-2"
            >
              <MessageCircle className="size-4" aria-hidden />
              {t(YO_COPY.coach.bridgeCta, locale)}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
