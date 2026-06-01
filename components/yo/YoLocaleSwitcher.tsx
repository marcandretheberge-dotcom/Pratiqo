/**
 * YoLocaleSwitcher — Server-rendered FR / EN / ES segmented control.
 *
 * Why this component exists
 * -------------------------
 * Pages on the YoPratiqo Quebec French premium-module surface already
 * accept `?lang=fr|en|es` and return locale-aware content, but until
 * now no visible UI let a learner switch locale. This component is the
 * UI: a compact, pill-style trio of links rendered as a single `<nav>`
 * landmark.
 *
 * Design decisions
 * ----------------
 * 1. Server Component on purpose — no `"use client"`, no `useState`,
 *    no router hooks. The locale is already known on the server (the
 *    page reads `?lang=…` once), so all three target hrefs can be
 *    computed inline without forcing a client boundary or hydrating
 *    state. Keeping the switcher server-rendered also means it can be
 *    embedded directly inside any other Server Component (like
 *    `YoPremiumModuleShell`) without flipping the whole subtree to
 *    client rendering.
 * 2. Visible labels stay in their OWN language ("Français" / "English"
 *    / "Español") regardless of `currentLocale` — that's the entire
 *    point of a language switcher, so a learner who landed in the
 *    "wrong" language still recognises the option for their own.
 * 3. The hrefs are built INLINE on this surface as `${basePath}?lang=…`
 *    for all three locales — including `?lang=fr`, even though FR is
 *    the default. The spec calls for an always-complete, symmetrical
 *    trio of explicit links so the switcher reads as a single
 *    segmented control rather than "2 links + a bare path". This is
 *    why we intentionally do NOT call `buildYoLocaleHref` here, even
 *    though it exists in `lib/yo/localize.ts`.
 * 4. The active link is non-interactive in spirit (it points at the
 *    page the user is already on) so we mark it with
 *    `aria-current="page"` AND disable Link prefetching for it —
 *    Next.js Link in the App Router accepts `prefetch={false}` to
 *    skip the same-page prefetch.
 * 5. No payment / Supabase / Stripe / RLS / booking / Membre Pro /
 *    commission / audio-generation imports — the component is a pure
 *    presentational nav landmark; the premium-shell regression test
 *    asserts this stays the case.
 */

import Link from "next/link";

import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";

export interface YoLocaleSwitcherProps {
  /** Locale currently rendered on the page. Drives the active-link styling. */
  currentLocale: YoLocale;
  /**
   * Path segment WITHOUT the `?lang=` query, e.g.
   * `/yo/langues/francais-quebec/module-1`. Every link href is built
   * by appending `?lang=<locale>` to this base.
   */
  basePath: string;
  /**
   * Optional override for the nav landmark's accessible name. When
   * omitted the component falls back to a localized "Choose language"
   * label so the landmark reads correctly to screen readers in any
   * supported locale.
   */
  ariaLabel?: string;
  /** Optional extra classes appended to the outer `<nav>` element. */
  className?: string;
}

interface SwitcherEntry {
  readonly locale: YoLocale;
  /** Always rendered in the target language, never translated. */
  readonly label: string;
  /** Matches the BCP-47 tag we want on the `<a lang>` and `hrefLang`. */
  readonly htmlLang: string;
  /**
   * Literal query fragment for this locale. Kept as a string constant
   * (not interpolated) so the explicit `?lang=fr` / `?lang=en` /
   * `?lang=es` forms are statically present in the source — both the
   * spec and the premium-shell regression test depend on that
   * invariant (the trio must always read as a complete, symmetrical
   * segmented control).
   */
  readonly queryFragment: "?lang=fr" | "?lang=en" | "?lang=es";
}

const SWITCHER_ENTRIES: readonly SwitcherEntry[] = [
  {
    locale: "fr",
    label: "Français",
    htmlLang: "fr",
    queryFragment: "?lang=fr",
  },
  {
    locale: "en",
    label: "English",
    htmlLang: "en",
    queryFragment: "?lang=en",
  },
  {
    locale: "es",
    label: "Español",
    htmlLang: "es",
    queryFragment: "?lang=es",
  },
];

const DEFAULT_ARIA_LABEL = lstr(
  "Choisir la langue",
  "Choose language",
  "Elegir idioma",
);

const BASE_WRAPPER_CLASS =
  "inline-flex flex-wrap items-center gap-1 rounded-full border border-[#0F6E56]/20 bg-white/85 p-1 shadow-[0_1px_2px_rgba(15,58,52,0.05)]";

const ACTIVE_LINK_CLASS =
  "inline-flex items-center justify-center rounded-full bg-[#0F6E56] px-3 py-1.5 text-xs sm:text-sm font-bold text-white shadow-[0_4px_10px_rgba(15,110,86,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]";

const INACTIVE_LINK_CLASS =
  "inline-flex items-center justify-center rounded-full border border-transparent px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#0F6E56] transition hover:bg-[#DDF4F1]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B400]";

export function YoLocaleSwitcher({
  currentLocale,
  basePath,
  ariaLabel,
  className,
}: YoLocaleSwitcherProps) {
  const resolvedAriaLabel =
    ariaLabel && ariaLabel.length > 0
      ? ariaLabel
      : t(DEFAULT_ARIA_LABEL, currentLocale);

  const wrapperClass =
    className && className.length > 0
      ? `${BASE_WRAPPER_CLASS} ${className}`
      : BASE_WRAPPER_CLASS;

  return (
    <nav aria-label={resolvedAriaLabel} className={wrapperClass}>
      {SWITCHER_ENTRIES.map((entry) => {
        const isActive = entry.locale === currentLocale;
        const href = `${basePath}${entry.queryFragment}`;
        const linkClass = isActive ? ACTIVE_LINK_CLASS : INACTIVE_LINK_CLASS;

        return (
          <Link
            key={entry.locale}
            href={href}
            lang={entry.htmlLang}
            hrefLang={entry.htmlLang}
            aria-current={isActive ? "page" : undefined}
            prefetch={isActive ? false : undefined}
            className={linkClass}
          >
            {entry.label}
          </Link>
        );
      })}
    </nav>
  );
}
