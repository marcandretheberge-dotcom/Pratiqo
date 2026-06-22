"use client";

// PostHog page-view tracker.
//
// Why a single client component (not posthog-js autocapture)
// ----------------------------------------------------------
// We do NOT use posthog-js autocapture (see `lib/analytics/posthog.ts`
// header for the rationale). This component is the canonical pageview
// emitter for Pratiqo and runs in two layers:
//
//   1. Universal `$pageview` — PostHog's reserved event, fired on every
//      navigation. PostHog's stock Insights / Funnels / Path analysis
//      widgets key off this exact event name. Without it, those
//      dashboards stay empty for any route we haven't custom-named.
//
//   2. Path-specific product events — fired in addition to `$pageview`
//      for surfaces we want as named cohorts:
//        - `/`                          → landing_viewed
//        - `/yo/langues/<lang>`         → yopratiqo_landing_viewed
//        - `/yo/langues/<lang>/intro`   → yopratiqo_intro_started
//        - `/admin/users`               → admin_users_viewed
//
// Both layers go through `capturePostHogEvent`, which also attaches
// `$current_url`, `$host`, `$pathname` automatically — so the dashboard
// can split events by path even if the named event is generic.
//
// Duplication contract
// --------------------
// Because we never call `posthog.init()` (no posthog-js dep), there is
// no autocapture / `capture_pageview: true` to compete with. The only
// pageview emitter in the app is this component. The `lastFiredRef`
// guard ensures we fire exactly one set of events per real navigation
// (StrictMode-safe). Adding posthog-js later would require explicitly
// disabling its `capture_pageview` to preserve this contract — see
// `docs/ANALYTICS_AND_MONITORING.md` §8.
//
// Mounting: rendered once inside `app/providers.tsx` so it runs for
// every route in the app.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isSensitiveAnalyticsRoute } from "@/lib/privacy/sensitiveAnalyticsRoutes";
import {
  trackAdminUsersViewed,
  trackLandingViewed,
  trackPageView,
  trackYopratiqoIntroStarted,
  trackYopratiqoLandingViewed,
} from "@/lib/analytics/events";

function detectYoLandingLanguage(pathname: string): string | null {
  // Matches /yo/langues/<lang> and /yo/langues/<lang>/anything.
  // Returns the language slug ("espagnol", "anglais", …) or null.
  const m = pathname.match(/^\/yo\/langues\/([^/]+)(?:\/|$)/);
  return m ? m[1] : null;
}

export function PostHogPageView() {
  const pathname = usePathname();
  const lastFiredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (isSensitiveAnalyticsRoute(pathname)) return;
    // Guard against the React 18 StrictMode double-mount in dev. We only
    // want one event per real navigation.
    if (lastFiredRef.current === pathname) return;
    lastFiredRef.current = pathname;

    // Layer 1: universal PostHog `$pageview`. Fires on every route so
    // PostHog's out-of-the-box widgets see every navigation. The
    // capture layer auto-enriches with $current_url / $host / $pathname.
    trackPageView({ path: pathname });

    // Layer 2: path-specific product events for named cohorts.
    if (pathname === "/") {
      trackLandingViewed({ path: pathname });
      return;
    }

    const yoLang = detectYoLandingLanguage(pathname);
    if (yoLang) {
      // We send the language + locale (FR default for /yo/...) and the
      // module slug if the URL carries one. NEVER the full path — that
      // can leak nested ids in future.
      const moduleMatch = pathname.match(/^\/yo\/langues\/[^/]+\/(?:pays\/[^/]+\/)?(module-\d+)/);
      // `/yo/langues/<lang>/intro` (and the country-scoped Dominican
      // variant) is the canonical "free intro started" route. Fire the
      // intro event as well as the landing event so PostHog can compute
      // intro-CTR cleanly from page-views alone.
      if (/\/intro(?:\/|$)/.test(pathname)) {
        trackYopratiqoIntroStarted({
          language: yoLang,
          locale: "fr",
          module: moduleMatch ? moduleMatch[1] : null,
        });
        return;
      }
      trackYopratiqoLandingViewed({
        language: yoLang,
        locale: "fr",
        module: moduleMatch ? moduleMatch[1] : null,
      });
      return;
    }

    if (pathname === "/admin/users") {
      // rendered_count is filled at the table-render call-site (page.tsx
      // also emits this with the real count via the typed helper). This
      // page-view-level emit is the cohort floor; the page-side emit is
      // the funnel-quality emit. Both are intentional.
      trackAdminUsersViewed({ rendered_count: 0 });
      return;
    }
    // All other routes: no page-view event (by design).
  }, [pathname]);

  return null;
}
