/**
 * YoFeatureStrip — small marketing strip rendered near the bottom of the
 * Yo Pratiqo Voyage prototype page.
 *
 * Server component. Identical icon mapping to YoUnlockCard so a future
 * design tweak to one block can be mirrored to the other.
 */

import {
  Compass,
  GraduationCap,
  Headphones,
  Infinity as InfinityIcon,
  Layers,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type {
  YoFeature,
  YoFeatureIcon,
  YoLocale,
  YoLocalizedString,
} from "@/lib/yo/types";
import { t } from "@/lib/yo/localize";
import { YO_COPY } from "@/lib/yo/copy";

export interface YoFeatureStripProps {
  features: YoFeature[];
  locale: YoLocale;
  /** Optional localized title rendered above the strip. */
  title?: YoLocalizedString;
}

const ICONS: Record<YoFeatureIcon, LucideIcon> = {
  headphones: Headphones,
  layers: Layers,
  compass: Compass,
  "graduation-cap": GraduationCap,
  sparkles: Sparkles,
  "shield-check": ShieldCheck,
  infinity: InfinityIcon,
};

export function YoFeatureStrip({
  features,
  locale,
  title,
}: YoFeatureStripProps) {
  const resolvedTitle = t(title ?? YO_COPY.features.defaultTitle, locale);

  return (
    <section
      aria-labelledby="yo-feature-title"
      className="mx-auto w-full max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14"
    >
      {resolvedTitle ? (
        <h2
          id="yo-feature-title"
          className="mb-5 text-xl font-medium tracking-tight text-[#1a3a32] sm:text-2xl"
        >
          {resolvedTitle}
        </h2>
      ) : null}

      <ul
        role="list"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {features.map((feature) => {
          const Icon: LucideIcon = feature.icon
            ? ICONS[feature.icon]
            : Sparkles;
          return (
            <li
              key={feature.id}
              className="flex items-center gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.03)] sm:p-5"
            >
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"
              >
                <Icon className="size-4" />
              </span>
              <span className="text-sm font-medium text-[#1a3a32] sm:text-[0.95rem]">
                {t(feature.label, locale)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
