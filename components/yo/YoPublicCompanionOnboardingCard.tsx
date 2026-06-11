"use client";

/**
 * YoPublicCompanionOnboardingCard
 *
 * Public-bridge explainer card mounted on /yo. Replaces the old pair of
 * `<YoTeacherBridgeTeaser />` + `<YoTeacherBridgeConsentSection />`
 * which together rendered:
 *
 *   - a fake interactive consent checkbox in coming-soon mode,
 *   - a misleading status pill claiming consent persistence would
 *     ship "soon",
 *   - a misleading caption saying the checkbox did not yet create a
 *     real share,
 *   - a fake module count / level pulled from a demo summary, and
 *   - no visible companion image and no auth CTA.
 *
 * What this card actually does
 * ----------------------------
 *   • Shows the real travel-companion PNG (manifest-driven via
 *     `<CompanionAvatar visualId="travel" state="map" />`). Fallback
 *     emoji + icon only renders when the production asset is missing
 *     from the manifest — never on a missing-image network failure.
 *   • Explains, in plain FR/EN/ES, that progress sharing happens at
 *     booking time inside the booking modal — not here.
 *   • Surfaces honest auth-aware CTAs:
 *       - signed out → "Sign in to save my progress" (deep-links to
 *         `/login?next=/student/yopratiqo` so the user lands on their
 *         own YoPratiqo hub right after OAuth);
 *       - signed in  → "See my YoPratiqo companion" (deep-links to
 *         `/student/yopratiqo`).
 *   • Always shows secondary "Start Dominican Republic" + tertiary
 *     "Find a teacher" CTAs, plus a footer link to the full Pratiqo
 *     progression at `/student/progress` so the cross-product bridge
 *     stays visible in both directions (YoPratiqo ↔ Pratiqo).
 *
 * What this card does NOT do
 * --------------------------
 *   • It does NOT render a consent checkbox. The real booking-time
 *     consent surface (`YoBookingTeacherBridgeConsent`) inside
 *     `BookingModal` is the only place a student grants consent.
 *   • It does NOT call any API. No POST. No persistence. No fake
 *     progress.
 *   • It does NOT generate AI summaries, expose raw quiz answers,
 *     enable paid YoPratiqo checkout, or touch any of the other
 *     locked surfaces.
 *
 * Locale support: FR / EN / ES via the YoLocale union.
 */

import Link from "next/link";
import { ArrowRight, GraduationCap, LogIn, MapPin, ShieldCheck, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { YoLocale } from "@/lib/yo/types";
import { useAuth } from "@/components/AuthProvider";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";

type Copy = {
  eyebrow: string;
  title: string;
  body: string;
  privacy: string;
  ctaSignIn: string;
  ctaProgress: string;
  ctaDominicanRepublic: string;
  ctaFindTeacher: string;
  fullPratiqoProgress: string;
};

const COPY: Record<YoLocale, Copy> = {
  fr: {
    eyebrow: "Compagnon YoPratiqo",
    title: "Ton compagnon YoPratiqo peut suivre tes progrès",
    body: "Connecte-toi, termine des modules YoPratiqo, puis choisis de partager un résumé utile avec un professeur au moment de réserver un cours.",
    privacy:
      "Les professeurs voient seulement un résumé utile lorsque tu choisis de le partager. Les réponses brutes aux quiz ne sont pas partagées.",
    ctaSignIn: "Se connecter pour sauvegarder mes progrès",
    ctaProgress: "Voir mon compagnon YoPratiqo",
    ctaDominicanRepublic: "Commencer République dominicaine",
    ctaFindTeacher: "Trouver un professeur",
    fullPratiqoProgress: "Voir toute ma progression Pratiqo",
  },
  en: {
    eyebrow: "YoPratiqo companion",
    title: "Your YoPratiqo companion can follow your progress",
    body: "Sign in, complete YoPratiqo modules, then choose to share a useful summary with a teacher when booking a lesson.",
    privacy:
      "Teachers see only a useful summary when you choose to share it. Raw quiz answers are not shared.",
    ctaSignIn: "Sign in to save my progress",
    ctaProgress: "See my YoPratiqo companion",
    ctaDominicanRepublic: "Start Dominican Republic",
    ctaFindTeacher: "Find a teacher",
    fullPratiqoProgress: "View my full Pratiqo progress",
  },
  es: {
    eyebrow: "Compañero YoPratiqo",
    title: "Tu compañero YoPratiqo puede seguir tu progreso",
    body: "Inicia sesión, completa módulos de YoPratiqo y luego elige compartir un resumen útil con un profesor al reservar una clase.",
    privacy:
      "Los profesores ven solo un resumen útil cuando eliges compartirlo. Las respuestas brutas de los cuestionarios no se comparten.",
    ctaSignIn: "Inicia sesión para guardar mi progreso",
    ctaProgress: "Ver mi compañero YoPratiqo",
    ctaDominicanRepublic: "Empezar República Dominicana",
    ctaFindTeacher: "Encontrar un profesor",
    fullPratiqoProgress: "Ver todo mi progreso Pratiqo",
  },
};

function safeLocale(locale: YoLocale | undefined): YoLocale {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

// Centralized hrefs so the static smoke test can grep for them.
// `/login` accepts a `next=` param that the login page sanitizes via
// `sanitizeRelativeRedirectPath`, so deep-linking the post-OAuth
// destination is safe.
//
// Sign-in deep-links to `/student/yopratiqo` so a learner who entered
// through YoPratiqo lands back on the YoPratiqo hub (with their
// companion + course path) right after OAuth, instead of being dumped
// on the generic Pratiqo dashboard. The full Pratiqo progression at
// `/student/progress` stays linked in the secondary "View my full
// Pratiqo progress" affordance so the YoPratiqo ↔ Pratiqo bridge is
// always one click away in both directions.
const HREFS = {
  signIn: "/login?next=/student/yopratiqo",
  yopratiqoHub: "/student/yopratiqo",
  fullPratiqoProgress: "/student/progress",
  dominicanRepublic: "/yo/langues/espagnol/pays/republique-dominicaine",
  findTeacher: "/trouver-un-prof",
} as const;

export type YoPublicCompanionOnboardingCardProps = {
  locale: YoLocale;
  className?: string;
};

export function YoPublicCompanionOnboardingCard({
  locale,
  className,
}: YoPublicCompanionOnboardingCardProps): React.JSX.Element {
  const l = safeLocale(locale);
  const copy = COPY[l];
  const { user, loading } = useAuth();
  // While auth is resolving we show the sign-in CTA so we never
  // accidentally hide a useful action from a first-time visitor.
  // Once `loading` is false we trust the `user` flag.
  const isAuthenticated = !loading && Boolean(user);

  const primary = isAuthenticated
    ? { label: copy.ctaProgress, href: HREFS.yopratiqoHub, Icon: ArrowRight }
    : { label: copy.ctaSignIn, href: HREFS.signIn, Icon: LogIn };

  return (
    <section
      data-testid="yo-public-companion-onboarding-card"
      data-yo-public-bridge="onboarding"
      data-yo-public-bridge-authenticated={isAuthenticated ? "true" : "false"}
      aria-label={copy.title}
      className="bg-[#FAFCFB] py-12 sm:py-16"
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div
          className={cn(
            "grid gap-6 overflow-hidden rounded-[2rem] border border-[#DDF4F1] bg-gradient-to-br from-white via-[#FAFCFB] to-[#FFF4D6]",
            "p-6 shadow-[0_16px_42px_rgba(15,58,52,0.08)] sm:p-8 lg:grid-cols-[0.42fr_0.58fr] lg:items-center",
            className,
          )}
        >
          {/* Visible companion: the real travel PNG via the manifest. */}
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle,rgba(244,180,0,0.16),transparent_70%)]"
            />
            <CompanionAvatar
              visualId="travel"
              state="map"
              locale={l}
              size="lg"
              className="relative"
            />
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#F4B400]/45 bg-[#FFF4D6] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]">
                <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
                {copy.eyebrow}
              </span>
              <h2
                data-testid="yo-public-companion-onboarding-card-title"
                className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-[#0F6E56] sm:text-3xl"
              >
                {copy.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#0F6E56]/78 sm:text-base">
                {copy.body}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                data-testid="yo-public-companion-onboarding-card-primary-cta"
                href={primary.href}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.22)] transition hover:bg-[#0b5b47]"
              >
                <primary.Icon className="size-4" aria-hidden />
                {primary.label}
              </Link>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  data-testid="yo-public-companion-onboarding-card-dr-cta"
                  href={HREFS.dominicanRepublic}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#0F6E56]/20 bg-white px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-[#FFF4D6]"
                >
                  <MapPin className="size-4 text-[#1D9E75]" aria-hidden />
                  {copy.ctaDominicanRepublic}
                </Link>
                <Link
                  data-testid="yo-public-companion-onboarding-card-find-teacher-cta"
                  href={HREFS.findTeacher}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#0F6E56]/20 bg-white px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-[#DDF4F1]"
                >
                  <GraduationCap className="size-4 text-[#1D9E75]" aria-hidden />
                  {copy.ctaFindTeacher}
                </Link>
              </div>
            </div>

            <p
              data-testid="yo-public-companion-onboarding-card-privacy"
              className="flex items-start gap-2 text-xs leading-relaxed text-[#0F6E56]/72"
            >
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#1D9E75]" aria-hidden />
              <span>{copy.privacy}</span>
            </p>

            {/* Bridge back to the full Pratiqo platform. YoPratiqo is
                the self-paced product inside Pratiqo, not a replacement
                for it — this small link keeps `/student/progress`
                reachable in one click so the cross-product navigation
                story stays symmetric. */}
            <Link
              data-testid="yo-public-companion-onboarding-card-full-progress-link"
              href={HREFS.fullPratiqoProgress}
              className="inline-flex items-center gap-1.5 self-start text-xs font-bold text-[#0F6E56]/82 underline-offset-2 hover:underline"
            >
              <ArrowRight className="size-3.5" aria-hidden />
              {copy.fullPratiqoProgress}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
