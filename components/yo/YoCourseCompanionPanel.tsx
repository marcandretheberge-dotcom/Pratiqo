"use client";

/**
 * YoCourseCompanionPanel
 *
 * Course-level companion explainer rendered on a country course
 * home. Surfaces the YoPratiqo travel companion via the
 * production manifest (`<CompanionAvatar visualId="travel" />`)
 * and exposes ONE auth-aware CTA so signed-in students can jump
 * straight to /student/progress and signed-out visitors are
 * nudged into the audited /login route.
 *
 * What this panel does
 * --------------------
 *   • Shows the real travel companion PNG (manifest-driven —
 *     never a fake mascot).
 *   • Explains, in plain FR/EN/ES, that the companion follows
 *     the learner's progress and that progress sharing happens
 *     at booking time inside the booking modal, not here.
 *   • Surfaces an auth-aware CTA:
 *       signed in  → "Voir mon compagnon" → /student/progress
 *       signed out → "Connecte-toi pour sauvegarder tes progrès"
 *                     → /login?next=/student/progress
 *
 * What this panel does NOT do
 * ---------------------------
 *   • It does NOT render a consent checkbox.
 *   • It does NOT call any API. No POST. No persistence. No
 *     fake progress.
 *   • It does NOT generate AI summaries, expose raw quiz
 *     answers, enable paid YoPratiqo checkout, or touch any of
 *     the other locked surfaces.
 *
 * Locale support: FR / EN / ES.
 */

import Link from "next/link";
import { ArrowRight, LogIn, ShieldCheck, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { useAuth } from "@/components/AuthProvider";
import type { YoLocale } from "@/lib/yo/types";

type Copy = {
  eyebrow: string;
  title: string;
  body: string;
  privacy: string;
  ctaSignIn: string;
  ctaProgress: string;
};

const COPY: Record<YoLocale, Copy> = {
  fr: {
    eyebrow: "Compagnon YoPratiqo",
    title: "Ton compagnon suit ton parcours",
    body: "Ton compagnon YoPratiqo suit ton parcours. Quand tu réserves un professeur, tu peux partager un résumé utile de tes progrès.",
    privacy:
      "Les professeurs voient seulement un résumé utile lorsque tu choisis de le partager. Les réponses brutes aux quiz ne sont pas partagées.",
    ctaSignIn: "Connecte-toi pour sauvegarder tes progrès",
    ctaProgress: "Voir mon compagnon",
  },
  en: {
    eyebrow: "YoPratiqo companion",
    title: "Your companion follows your path",
    body: "Your YoPratiqo companion follows your path. When you book a teacher, you can share a useful summary of your progress.",
    privacy:
      "Teachers see only a useful summary when you choose to share it. Raw quiz answers are not shared.",
    ctaSignIn: "Sign in to save your progress",
    ctaProgress: "See my companion",
  },
  es: {
    eyebrow: "Compañero YoPratiqo",
    title: "Tu compañero sigue tu ruta",
    body: "Tu compañero YoPratiqo sigue tu ruta. Cuando reservas un profesor, puedes compartir un resumen útil de tu progreso.",
    privacy:
      "Los profesores ven solo un resumen útil cuando eliges compartirlo. Las respuestas brutas de los cuestionarios no se comparten.",
    ctaSignIn: "Inicia sesión para guardar tu progreso",
    ctaProgress: "Ver mi compañero",
  },
};

function safeLocale(locale: YoLocale | undefined): YoLocale {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

/**
 * Centralized hrefs so the static smoke test can grep for them.
 * `/login` accepts a `next=` param the login page sanitizes via
 * `sanitizeRelativeRedirectPath`, so deep-linking the post-OAuth
 * destination is safe.
 */
const HREFS = {
  signIn: "/login?next=/student/progress",
  progress: "/student/progress",
} as const;

export type YoCourseCompanionPanelProps = {
  locale: YoLocale;
  className?: string;
};

export function YoCourseCompanionPanel({
  locale,
  className,
}: YoCourseCompanionPanelProps): React.JSX.Element {
  const l = safeLocale(locale);
  const copy = COPY[l];
  const { user, loading } = useAuth();
  // While auth resolves we keep the sign-in CTA visible so a
  // first-time visitor is never shown an empty CTA slot.
  const isAuthenticated = !loading && Boolean(user);

  const primary = isAuthenticated
    ? { label: copy.ctaProgress, href: HREFS.progress, Icon: ArrowRight }
    : { label: copy.ctaSignIn, href: HREFS.signIn, Icon: LogIn };

  return (
    <section
      data-testid="yo-course-companion-panel"
      data-yo-course-companion="true"
      data-yo-course-companion-authenticated={isAuthenticated ? "true" : "false"}
      aria-label={copy.title}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-[#E7DFCF] bg-white p-5 shadow-[0_10px_28px_rgba(23,38,66,0.06)] sm:flex-row sm:items-center sm:gap-5 sm:p-6",
        className,
      )}
    >
      {/* Visible companion — the real travel PNG, manifest-driven. */}
      <div className="relative flex shrink-0 items-center justify-center self-center">
        <div
          aria-hidden
          className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(19,160,133,0.18),transparent_70%)]"
        />
        <CompanionAvatar
          visualId="travel"
          state="map"
          locale={l}
          size="md"
          className="relative"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#13A085]/30 bg-[#E3F1EB] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#172642]">
            <Sparkles className="size-3 text-[#13A085]" aria-hidden />
            {copy.eyebrow}
          </span>
          <h3
            data-testid="yo-course-companion-panel-title"
            className="mt-2 font-[var(--yo-app-display)] text-lg font-semibold leading-snug tracking-tight text-[#172642] sm:text-xl"
          >
            {copy.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#566073]">
            {copy.body}
          </p>
        </div>

        <Link
          data-testid="yo-course-companion-panel-cta"
          href={primary.href}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#172642] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0f1c33] sm:w-fit"
        >
          <primary.Icon className="size-4" aria-hidden />
          {primary.label}
        </Link>

        <p
          data-testid="yo-course-companion-panel-privacy"
          className="flex items-start gap-2 text-xs leading-relaxed text-[#566073]"
        >
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#13A085]" aria-hidden />
          <span>{copy.privacy}</span>
        </p>
      </div>
    </section>
  );
}

export default YoCourseCompanionPanel;
