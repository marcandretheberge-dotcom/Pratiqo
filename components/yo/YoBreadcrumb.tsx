/**
 * YoBreadcrumb — small, locale-aware breadcrumb used across the
 * /yo information architecture.
 *
 * Each item carries:
 *   - `label`: bilingual `YoLocalizedString` rendered through `t()`
 *   - `href`:  optional. When null/undefined the item is rendered as
 *     the current page (no link, `aria-current="page"`).
 *
 * The component is a Server Component (no client state, no hooks),
 * so it can be safely composed inside any of the Yo pages without
 * forcing a `"use client"` boundary.
 *
 * Mobile-friendly: uses `flex-wrap` + `text-xs` so long French
 * destination names don't push siblings off-screen on 320 px+
 * viewports.
 */

import Link from "next/link";
import type { YoLocale, YoLocalizedString } from "@/lib/yo/types";
import { t } from "@/lib/yo/localize";

export interface YoBreadcrumbItem {
  label: YoLocalizedString;
  href?: string | null;
}

export interface YoBreadcrumbProps {
  items: YoBreadcrumbItem[];
  locale: YoLocale;
  /** Tailwind className for the wrapping `<nav>` element. */
  className?: string;
}

export function YoBreadcrumb({ items, locale, className }: YoBreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <nav
      aria-label={
        locale === "fr"
          ? "Fil d’Ariane"
          : locale === "es"
            ? "Ruta de navegación"
            : "Breadcrumb"
      }
      className={
        className ??
        "mx-auto w-full max-w-5xl px-5 pt-6 text-xs text-[#0F6E56]/72 sm:px-8 sm:text-sm"
      }
    >
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = t(item.label, locale);
          return (
            <li key={`${label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded text-[#0F6E56] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]"
                >
                  {label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={
                    isLast ? "font-semibold text-[#0F6E56]" : "text-[#0F6E56]/72"
                  }
                >
                  {label}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden className="text-[#0F6E56]/45">
                  ›
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
