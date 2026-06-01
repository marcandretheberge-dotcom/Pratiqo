/**
 * YoPratiqo — Upcoming module entry-point card.
 *
 * Discoverability surface for the Quebec French / Francisation workplace
 * module shell that lives at /yo/langues/francais-quebec/module-1.
 *
 * The module itself remains:
 *   - noindex
 *   - excluded from the sitemap
 *   - free of Course JSON-LD
 *   - free of checkout / payments / Stripe / Supabase / RLS / migrations
 *   - "coming soon / preview" only — no live price, no urgency, no
 *     guarantees of fluency / employment / immigration outcomes
 *
 * This card is purely a navigational pitch. It carries no checkout, no
 * price hint, no countdown, no discount, no booking glue, and no audio
 * data. It only renders the trilingual "coming soon / preview" copy
 * and a Link to the locale-aware module URL passed in as `href`.
 *
 * The optional `secondaryHref` slot accepts a /trouver-un-prof link so a
 * learner who would rather practise with a real teacher can pivot. It is
 * intentionally optional so the caller can skip it when the surrounding
 * page already exposes a teacher-search link nearby.
 */

import Link from "next/link";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";

import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";

// Eyebrow / heading — the spec-pinned trilingual copy. The em-dash
// (U+2014) and the smart apostrophes (U+2019) are intentional and must
// match the exact strings the test asserts.
const EYEBROW = lstr(
  "Module à venir — Français québécois au travail",
  "Upcoming module — Quebec French at work",
  "Módulo próximamente — Francés quebequense en el trabajo",
);

const BODY = lstr(
  "Explorez l’aperçu de la première leçon : arriver au travail, saluer naturellement et choisir entre tu et vous.",
  "Preview the first lesson: arriving at work, greeting naturally, and choosing between tu and vous.",
  "Explora la primera lección: llegar al trabajo, saludar naturalmente y elegir entre tu y vous.",
);

const PRIMARY_CTA = lstr(
  "Voir le module à venir",
  "Preview the upcoming module",
  "Ver el módulo próximamente",
);

const SECONDARY_CTA = lstr(
  "Trouver un prof",
  "Find a teacher",
  "Encontrar un profesor",
);

// Small "preview / coming soon" pill rendered above the heading. The
// pill exists so the card is unambiguously framed as a preview at a
// glance — the same idea that the test enforces by looking for one of
// {à venir, aperçu} / {upcoming, preview} / {próximamente, vista
// previa, próxima lección}.
const PREVIEW_LABEL = lstr("Aperçu", "Preview", "Vista previa");

export function YoUpcomingModuleCard({
  locale,
  href,
  secondaryHref,
}: {
  locale: YoLocale;
  href: string;
  secondaryHref?: string;
}) {
  return (
    <article
      aria-labelledby="yo-upcoming-module-card-title"
      className="relative overflow-hidden rounded-3xl border border-[#F4B400]/45 bg-gradient-to-br from-[#FFF4D6] via-white to-[#DDF4F1] p-6 shadow-[0_10px_30px_rgba(15,58,52,0.07)] sm:p-7"
    >
      <div
        aria-hidden
        className="absolute -right-16 -top-16 size-48 rounded-full bg-[#F4B400]/20 blur-3xl"
      />
      <div className="relative flex flex-col gap-4">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#F4B400]/45 bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#8a5a17]">
          <Sparkles className="size-3.5 text-[#F4B400]" aria-hidden />
          {t(PREVIEW_LABEL, locale)}
        </span>
        <div>
          <h2
            id="yo-upcoming-module-card-title"
            className="text-xl font-semibold tracking-tight text-[#0F6E56] sm:text-[1.45rem]"
          >
            {t(EYEBROW, locale)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#0F6E56]/78 sm:text-[0.95rem]">
            {t(BODY, locale)}
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
          <Link
            href={href}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(15,110,86,0.22)] transition hover:bg-[#0b5b47]"
          >
            {t(PRIMARY_CTA, locale)}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          {secondaryHref ? (
            <Link
              href={secondaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0F6E56]/18 bg-white/70 px-5 py-3 text-sm font-bold text-[#0F6E56] transition hover:bg-white"
            >
              <MessageCircle className="size-4" aria-hidden />
              {t(SECONDARY_CTA, locale)}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
