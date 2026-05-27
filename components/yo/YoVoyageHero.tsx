/**
 * YoVoyageHero — top-of-page hero for a Yo Pratiqo Voyage module.
 *
 * Server component. Renders the small product label, hero title, subtitle
 * and the CEFR level badge. No client interactivity, no Supabase calls.
 */

import type { YoModule } from "@/lib/yo/types";

export interface YoVoyageHeroProps {
  module: YoModule;
}

export function YoVoyageHero({ module }: YoVoyageHeroProps) {
  return (
    <section
      aria-labelledby="yo-hero-title"
      className="relative overflow-hidden border-b border-teal-100/70 bg-gradient-to-b from-[var(--color-base-cream)] via-white to-white"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:gap-8 lg:pt-20">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-teal-700">
          <span className="ds-label text-teal-700/90">
            {module.productLabel}
          </span>
          <span aria-hidden className="text-teal-300">
            ·
          </span>
          <span className="ds-label text-teal-700/80">
            {module.destinationLabelFr}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <h1
            id="yo-hero-title"
            className="max-w-3xl text-3xl font-medium tracking-tight text-[#1a3a32] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
          >
            {module.heroTitle}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
            {module.heroSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-teal">
            Niveau {module.cefrLevel} · Débutant
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-teal-500"
            />
            Travel-ready en 1h
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-100">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-[var(--color-accent-500)]"
            />
            Audio natif
          </span>
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
