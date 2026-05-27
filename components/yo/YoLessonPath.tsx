/**
 * YoLessonPath — numbered lesson roadmap for a Yo Pratiqo Voyage module.
 *
 * Server component. Renders the 5 steps in display order, only the first
 * "free_preview" or "available" step gets a real CTA; the rest are visual
 * "verrouillé" placeholders (Phase 1: no real access control).
 */

import { Lock, PlayCircle } from "lucide-react";
import type { YoLessonPathStep } from "@/lib/yo/types";
import { cn } from "@/lib/utils";

export interface YoLessonPathProps {
  steps: YoLessonPathStep[];
  /**
   * Optional href passed to the active CTA. Defaults to "#" because Phase 1
   * has no real lesson destination yet.
   */
  activeHref?: string;
}

export function YoLessonPath({
  steps,
  activeHref = "#",
}: YoLessonPathProps) {
  return (
    <section
      aria-labelledby="yo-path-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2
          id="yo-path-title"
          className="text-xl font-medium tracking-tight text-[#1a3a32] sm:text-2xl"
        >
          Ton parcours
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] sm:text-sm">
          Commence par l’Intro · déblocage des autres étapes en payant une fois
        </p>
      </div>

      <ol
        role="list"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4"
      >
        {steps.map((step) => {
          const isUnlocked =
            step.status === "free_preview" || step.status === "available";
          return (
            <li key={step.id} className="list-none">
              <PathStepCard
                step={step}
                isUnlocked={isUnlocked}
                href={isUnlocked ? activeHref : undefined}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

interface PathStepCardProps {
  step: YoLessonPathStep;
  isUnlocked: boolean;
  href: string | undefined;
}

function PathStepCard({ step, isUnlocked, href }: PathStepCardProps) {
  const base =
    "flex h-full flex-col justify-between gap-3 rounded-2xl border p-4 transition";
  const unlockedClasses =
    "border-teal-200 bg-white hover:border-teal-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2";
  const lockedClasses =
    "border-dashed border-teal-100/80 bg-[var(--color-base-cream)] text-[var(--color-text-secondary)]";

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-xs font-semibold",
            isUnlocked
              ? "bg-teal-500 text-white"
              : "bg-teal-50 text-teal-700/80",
          )}
        >
          {step.position}
        </span>
        {isUnlocked ? (
          <PlayCircle aria-hidden className="size-4 text-teal-700" />
        ) : (
          <Lock aria-hidden className="size-4 text-teal-700/50" />
        )}
      </div>

      <div>
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            isUnlocked ? "text-[#1a3a32]" : "text-[var(--color-text-secondary)]",
          )}
        >
          {step.title}
        </p>
      </div>

      <div>
        <span
          className={cn(
            "inline-flex items-center text-xs font-medium",
            isUnlocked ? "text-teal-700" : "text-teal-700/60",
          )}
        >
          {step.ctaLabel}
          {isUnlocked ? <span aria-hidden> →</span> : null}
        </span>
      </div>
    </>
  );

  if (isUnlocked && href) {
    return (
      <a
        href={href}
        aria-label={`Lesson ${step.position} — ${step.title}, ${step.ctaLabel}`}
        className={cn(base, unlockedClasses)}
      >
        {inner}
      </a>
    );
  }

  return (
    <div
      aria-disabled
      aria-label={`Lesson ${step.position} — ${step.title}, ${step.ctaLabel}`}
      className={cn(base, lockedClasses)}
    >
      {inner}
    </div>
  );
}
