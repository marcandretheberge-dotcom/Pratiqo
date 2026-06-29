/**
 * YoCoursePath
 *
 * App-style course roadmap. Renders the 5-step path of the
 * Dominican Republic A1 → A2 course as a vertical stack of
 * touch-friendly cards on mobile, opening to a slightly wider
 * column on desktop. Replaces the legacy <YoLessonPath /> grid
 * for the Course Home surface (legacy lesson-path is still
 * mounted lower in the original `RepubliqueDominicaineContent`
 * when the country page opts out of the new layout).
 *
 * Each step card surfaces:
 *
 *   • the step number (1 → 5, rendered as a circular numeral)
 *   • the title (localized)
 *   • a one-line outcome (the lesson subtitle in the source data)
 *   • the CEFR level for that step (A1 for 1–4, A2 for 5)
 *   • a status badge (next / available / completed)
 *   • a CTA (Commencer / Ouvrir / Mission finale)
 *
 * Statuses are deliberately STATIC at the moment — Phase 1 does
 * not have a per-step "completed" signal yet, so every card
 * defaults to `available` except for the first card which is
 * highlighted as `next`. Once the `/api/yo/progress` snapshot
 * surface ships consumer-side, this component can switch on
 * `step.status` to render `completed` checkmarks. No fake user
 * progress is rendered today.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Pure server component. No client hooks, no API calls, no
 *     persistence, no payment library, no Supabase write, no
 *     quiz data, no AI summary, no analytics.
 */

import Link from "next/link";
import { Check, Lock, MapPin, PlayCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { YoLocale } from "@/lib/yo/types";

export type YoCoursePathStatus = "next" | "available" | "completed" | "locked";

export type YoCoursePathStep = {
  /** 1-indexed position rendered as the circular numeral. */
  position: number;
  title: string;
  /** One-line outcome rendered under the title. */
  outcome: string;
  level: "A1" | "A2";
  status: YoCoursePathStatus;
  ctaLabel: string;
  /** Anchor or absolute route. Locked steps may omit `href`. */
  href?: string;
};

type Copy = {
  sectionEyebrow: string;
  sectionTitle: string;
  sectionBody: string;
  statusNext: string;
  statusAvailable: string;
  statusCompleted: string;
  statusLocked: string;
};

const COPY: Record<YoLocale, Copy> = {
  fr: {
    sectionEyebrow: "Parcours",
    sectionTitle: "Ton parcours",
    sectionBody:
      "Cinq étapes courtes pour passer de tes premières phrases à une mission finale A2.",
    statusNext: "À commencer",
    statusAvailable: "Disponible",
    statusCompleted: "Terminé",
    statusLocked: "Verrouillé",
  },
  en: {
    sectionEyebrow: "Path",
    sectionTitle: "Your path",
    sectionBody:
      "Five short steps from your first phrases to a final A2 mission.",
    statusNext: "Next up",
    statusAvailable: "Available",
    statusCompleted: "Completed",
    statusLocked: "Locked",
  },
  es: {
    sectionEyebrow: "Ruta",
    sectionTitle: "Tu ruta",
    sectionBody:
      "Cinco pasos cortos para pasar de tus primeras frases a una misión final A2.",
    statusNext: "Por empezar",
    statusAvailable: "Disponible",
    statusCompleted: "Terminado",
    statusLocked: "Bloqueado",
  },
};

function safeLocale(locale: YoLocale | undefined): YoLocale {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

export type YoCoursePathProps = {
  locale: YoLocale;
  steps: readonly YoCoursePathStep[];
  className?: string;
};

export function YoCoursePath({
  locale,
  steps,
  className,
}: YoCoursePathProps): React.JSX.Element {
  const l = safeLocale(locale);
  const copy = COPY[l];

  return (
    <section
      data-testid="yo-course-path"
      data-yo-course-path="true"
      aria-labelledby="yo-course-path-title"
      className={cn("flex w-full flex-col gap-4", className)}
    >
      <header className="flex flex-col gap-1">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#13A085]/30 bg-[#E3F1EB] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#172642]">
          <MapPin className="size-3 text-[#13A085]" aria-hidden />
          {copy.sectionEyebrow}
        </span>
        <h2
          id="yo-course-path-title"
          className="font-yo-app-display text-[22px] font-semibold leading-tight tracking-tight text-[#172642] sm:text-2xl"
        >
          {copy.sectionTitle}
        </h2>
        <p className="text-sm leading-relaxed text-[#566073]">
          {copy.sectionBody}
        </p>
      </header>

      <ol role="list" className="flex flex-col gap-3">
        {steps.map((step) => {
          const statusLabel =
            step.status === "next"
              ? copy.statusNext
              : step.status === "completed"
                ? copy.statusCompleted
                : step.status === "locked"
                  ? copy.statusLocked
                  : copy.statusAvailable;

          // Locked steps never render an anchor (no real route),
          // so we render a <li> with `aria-disabled="true"` and
          // a Lock icon. The Phase 1 data has no locked steps in
          // the RD course, but the contract is preserved so
          // future courses can opt-in.
          const isOpenable = step.status !== "locked" && Boolean(step.href);
          const inner = (
            <>
              {/* Circular numeral on the left */}
              <span
                aria-hidden
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-black",
                  step.status === "completed"
                    ? "bg-[#13A085] text-white"
                    : step.status === "next"
                      ? "bg-[#172642] text-white"
                      : step.status === "locked"
                        ? "bg-[#EFE7D6] text-[#566073]"
                        : "bg-[#E3F1EB] text-[#172642]",
                )}
              >
                {step.status === "completed" ? (
                  <Check className="size-5" aria-hidden />
                ) : step.status === "locked" ? (
                  <Lock className="size-4" aria-hidden />
                ) : (
                  String(step.position).padStart(2, "0")
                )}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-bold text-[#172642]">
                    {step.title}
                  </p>
                  <span className="inline-flex items-center rounded-full border border-[#E7DFCF] bg-[#FBF7EE] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#566073]">
                    {step.level}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                      step.status === "next"
                        ? "border border-[#172642]/15 bg-[#172642]/8 text-[#172642]"
                        : step.status === "completed"
                          ? "border border-[#13A085]/25 bg-[#E3F1EB] text-[#172642]"
                          : step.status === "locked"
                            ? "border border-[#E7DFCF] bg-[#EFE7D6] text-[#566073]"
                            : "border border-[#E7DFCF] bg-white text-[#566073]",
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>
                <p className="text-xs leading-snug text-[#566073] sm:text-[13px]">
                  {step.outcome}
                </p>
                {isOpenable ? (
                  <span className="inline-flex w-fit items-center gap-1 pt-1 text-sm font-bold text-[#13A085]">
                    <PlayCircle className="size-4" aria-hidden />
                    {step.ctaLabel}
                  </span>
                ) : null}
              </div>
            </>
          );

          return (
            <li
              key={step.position}
              data-yo-course-path-step={step.position}
              className="list-none"
            >
              {isOpenable && step.href ? (
                <Link
                  href={step.href}
                  className={cn(
                    "flex items-stretch gap-3 rounded-2xl border border-[#E7DFCF] bg-white p-4 transition hover:border-[#13A085]/30 hover:bg-[#FBF7EE]",
                    step.status === "next" &&
                      "border-[#172642]/15 shadow-[0_10px_28px_rgba(23,38,66,0.08)]",
                  )}
                >
                  {inner}
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className="flex cursor-default items-stretch gap-3 rounded-2xl border border-[#E7DFCF] bg-white/70 p-4"
                >
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default YoCoursePath;
