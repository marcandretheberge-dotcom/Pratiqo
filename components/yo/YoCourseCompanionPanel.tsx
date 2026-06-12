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
 *       signed in  → "Voir mon compagnon" → /student/yopratiqo
 *                    (the authenticated YoPratiqo hub)
 *       signed out → "Connecte-toi pour sauvegarder tes progrès"
 *                     → /login?next=/student/yopratiqo
 *   • Surfaces a small secondary "Voir toute ma progression Pratiqo"
 *     link to /student/progress so the YoPratiqo ↔ Pratiqo bridge is
 *     always reachable in both directions (YoPratiqo is the self-paced
 *     product *inside* Pratiqo, not a replacement for it).
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
  fullPratiqoProgress: string;
};

const COPY: Record<YoLocale, Copy> = {
  fr: {
    eyebrow: "Yoppo · compagnon",
    title: "Yoppo suit ton parcours",
    body: "Quand tu réserves un professeur, tu peux partager un résumé utile de tes progrès.",
    privacy:
      "Les professeurs voient seulement un résumé utile lorsque tu choisis de le partager. Les réponses brutes aux quiz ne sont pas partagées.",
    ctaSignIn: "Connecte-toi pour sauvegarder tes progrès",
    ctaProgress: "Voir Yoppo",
    fullPratiqoProgress: "Voir toute ma progression Pratiqo",
  },
  en: {
    eyebrow: "Yoppo · companion",
    title: "Yoppo follows your path",
    body: "When you book a teacher, you can share a useful summary of your progress.",
    privacy:
      "Teachers see only a useful summary when you choose to share it. Raw quiz answers are not shared.",
    ctaSignIn: "Sign in to save your progress",
    ctaProgress: "See Yoppo",
    fullPratiqoProgress: "View my full Pratiqo progress",
  },
  es: {
    eyebrow: "Yoppo · compañero",
    title: "Yoppo sigue tu ruta",
    body: "Cuando reservas un profesor, puedes compartir un resumen útil de tu progreso.",
    privacy:
      "Los profesores ven solo un resumen útil cuando eliges compartirlo. Las respuestas brutas de los cuestionarios no se comparten.",
    ctaSignIn: "Inicia sesión para guardar tu progreso",
    ctaProgress: "Ver a Yoppo",
    fullPratiqoProgress: "Ver todo mi progreso Pratiqo",
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
 *
 * The primary CTA targets `/student/yopratiqo` (the authenticated
 * YoPratiqo hub) so a learner coming from the Course Home lands in
 * the YoPratiqo product context after login, not on a generic
 * dashboard. The full Pratiqo progression page (`/student/progress`)
 * stays one click away through the secondary "View my full Pratiqo
 * progress" link below.
 */
const HREFS = {
  signIn: "/login?next=/student/yopratiqo",
  yopratiqoHub: "/student/yopratiqo",
  fullPratiqoProgress: "/student/progress",
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
    ? { label: copy.ctaProgress, href: HREFS.yopratiqoHub, Icon: ArrowRight }
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

        {/* Secondary bridge to the full Pratiqo progression. Renders
            as a quiet text link beneath the primary CTA so the
            YoPratiqo → Pratiqo direction of the cross-product bridge
            stays reachable in one click without competing with the
            primary "see my companion" action above. */}
        <Link
          data-testid="yo-course-companion-panel-full-progress-link"
          href={HREFS.fullPratiqoProgress}
          className="inline-flex items-center gap-1.5 self-start text-xs font-bold text-[#172642]/82 underline-offset-2 hover:underline"
        >
          <ArrowRight className="size-3.5" aria-hidden />
          {copy.fullPratiqoProgress}
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
