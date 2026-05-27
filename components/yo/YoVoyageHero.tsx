/**
 * YoVoyageHero — top-of-page hero for a Yo Pratiqo Voyage module.
 *
 * Server component. Renders the small product label, hero title, subtitle,
 * the CEFR level badge AND a code-based tropical visual placeholder
 * (`YoHeroTropicalArt`). Phase 2 will swap the placeholder for a real
 * image at `module.heroImagePath` once one exists at
 * `/public/images/yo/voyage/do/hero-dominican-republic.webp`.
 *
 * Bilingual: all localized strings on `module` are resolved with `t()`
 * against the incoming `locale`. The level badge mixes the CEFR code
 * (locale-independent, e.g. "A1") with a locale-specific suffix.
 */

import type { YoLocale, YoModule } from "@/lib/yo/types";
import { YoHeroTropicalArt } from "@/components/yo/YoVisuals";
import { t } from "@/lib/yo/localize";
import { YO_COPY } from "@/lib/yo/copy";

export interface YoVoyageHeroProps {
  module: YoModule;
  locale: YoLocale;
}

export function YoVoyageHero({ module, locale }: YoVoyageHeroProps) {
  const beginnerSuffix = locale === "fr" ? "Débutant" : "Beginner";
  const levelPrefix = locale === "fr" ? "Niveau" : "Level";

  return (
    <section
      aria-labelledby="yo-hero-title"
      className="relative overflow-hidden border-b border-teal-100/70 bg-gradient-to-b from-[var(--color-base-cream)] via-white to-white"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-10 lg:pt-20">
        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-teal-700">
            <span className="ds-label text-teal-700/90">
              {t(module.productLabel, locale)}
            </span>
            <span aria-hidden className="text-teal-300">
              ·
            </span>
            <span className="ds-label text-teal-700/80">
              {t(module.destinationLabel, locale)}
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <h1
              id="yo-hero-title"
              className="max-w-3xl text-3xl font-medium tracking-tight text-[#1a3a32] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
            >
              {t(module.heroTitle, locale)}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
              {t(module.heroSubtitle, locale)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-teal">
              {levelPrefix} {module.cefrLevel} · {beginnerSuffix}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-teal-500"
              />
              {t(YO_COPY.hero.travelReady, locale)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-[var(--color-accent-500)]"
              />
              {t(YO_COPY.hero.nativeAudio, locale)}
            </span>
          </div>
        </div>

        {/* Tropical visual — code-based placeholder. Replaced in Phase 2 by
            a real photo at module.heroImagePath when one exists. */}
        <div className="relative lg:h-full">
          <YoHeroTropicalArt />
        </div>
      </div>

      {/* Decorative gradient blob — purely visual, never reaches screen readers. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 hidden size-72 rounded-full bg-teal-100/60 blur-3xl sm:block"
      />
    </section>
  );
}
