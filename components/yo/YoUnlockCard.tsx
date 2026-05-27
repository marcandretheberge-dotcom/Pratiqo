/**
 * YoUnlockCard — pre-purchase promo block for the Yo Pratiqo Voyage module.
 *
 * Server component. Phase 1 only — the CTA is a visual placeholder
 * (`href="#"` by default). Stripe checkout is wired in Phase 2.
 *
 * Bilingual: takes raw `priceCents` + `locale` and formats the price label
 * via `formatYoPrice` (e.g. "$24,99 CAD" in FR, "$24.99 CAD" in EN). All
 * other copy is sourced from `YO_COPY.unlock` and resolved with `t()`.
 */

import {
  Compass,
  GraduationCap,
  Headphones,
  Infinity as InfinityIcon,
  Layers,
  Sparkles,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type {
  YoCurrency,
  YoFeature,
  YoFeatureIcon,
  YoLocale,
  YoLocalizedString,
} from "@/lib/yo/types";
import { YoUnlockTravelStamp } from "@/components/yo/YoVisuals";
import { formatYoPrice, t } from "@/lib/yo/localize";
import { YO_COPY } from "@/lib/yo/copy";

export interface YoUnlockCardProps {
  features: YoFeature[];
  locale: YoLocale;
  /**
   * Raw price in cents. Locale-aware formatting is applied here:
   *   FR → "$24,99 CAD"
   *   EN → "$24.99 CAD"
   */
  priceCents: number;
  /** Defaults to "CAD". Currency unit stays uppercase ISO 4217. */
  currency?: YoCurrency;
  /** Optional override; defaults to the locked MVP copy. */
  subPriceCopy?: YoLocalizedString;
  /** Optional override; defaults to "Continuer" / "Continue". */
  ctaLabel?: YoLocalizedString;
  /** Phase 1: defaults to "#"; Phase 2 will route to checkout. */
  ctaHref?: string;
  /** Optional override for the small trust note under the CTA. */
  trustNote?: YoLocalizedString;
}

const FEATURE_ICONS: Record<YoFeatureIcon, LucideIcon> = {
  headphones: Headphones,
  layers: Layers,
  compass: Compass,
  "graduation-cap": GraduationCap,
  sparkles: Sparkles,
  "shield-check": ShieldCheck,
  infinity: InfinityIcon,
};

export function YoUnlockCard({
  features,
  locale,
  priceCents,
  currency = "CAD",
  subPriceCopy,
  ctaLabel,
  ctaHref = "#",
  trustNote,
}: YoUnlockCardProps) {
  const priceLabel = formatYoPrice(priceCents, locale, currency);
  const eyebrow = t(YO_COPY.unlock.eyebrow, locale);
  const title = t(YO_COPY.unlock.title, locale);
  const body = t(YO_COPY.unlock.body, locale);
  const priceEyebrow = t(YO_COPY.unlock.priceEyebrow, locale);
  const subPrice = t(subPriceCopy ?? YO_COPY.unlock.subPrice, locale);
  const cta = t(ctaLabel ?? YO_COPY.unlock.cta, locale);
  const trust = t(trustNote ?? YO_COPY.unlock.trustNote, locale);

  return (
    <section
      aria-labelledby="yo-unlock-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-white p-6 shadow-[0_8px_24px_rgba(15,58,52,0.06)] sm:p-8 lg:p-10">
        {/* Decorative gradient corner — purely visual. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-teal-100/50 blur-3xl"
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <span className="ds-label text-teal-700/90">{eyebrow}</span>
            <h2
              id="yo-unlock-title"
              className="mt-2 text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-3xl"
            >
              {title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.95rem]">
              {body}
            </p>

            <ul role="list" className="mt-6 grid gap-2 sm:grid-cols-2">
              {features.map((feature) => (
                <li
                  key={feature.id}
                  className="flex items-center gap-2 text-sm text-[#1a3a32]"
                >
                  <FeatureIcon icon={feature.icon} />
                  <span>{t(feature.label, locale)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5 ring-1 ring-teal-100 sm:p-6"
            style={{
              background:
                "linear-gradient(165deg, #fffaf0 0%, #fff4e2 55%, #f3e8d0 100%)",
            }}
          >
            <YoUnlockTravelStamp locale={locale} />

            <div className="relative">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-800 ring-1 ring-teal-100">
                <Sparkles aria-hidden className="size-3" />
                {priceEyebrow}
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-[#1a3a32] sm:text-[2.75rem]">
                {priceLabel}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {subPrice}
              </p>
            </div>

            <a
              href={ctaHref}
              className="ds-btn-primary inline-flex items-center justify-center gap-2 text-center text-sm shadow-[0_6px_18px_rgba(15,118,110,0.28)] sm:text-base"
            >
              {cta}
              <span aria-hidden>→</span>
            </a>

            <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
              <ShieldCheck aria-hidden className="size-3.5 text-teal-700" />
              {trust}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureIcon({ icon }: { icon: YoFeatureIcon | undefined }) {
  if (!icon) {
    return (
      <span
        aria-hidden
        className="size-4 shrink-0 rounded-full bg-teal-100"
      />
    );
  }
  const Icon = FEATURE_ICONS[icon];
  return (
    <span
      aria-hidden
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700"
    >
      <Icon className="size-3" />
    </span>
  );
}
