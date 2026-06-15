"use client";

// PostHog page-view tracker.
//
// Why a single client component (not autocapture)
// -----------------------------------------------
// We do NOT use posthog-js autocapture (see `lib/analytics/posthog.ts`
// header for the rationale). Instead, this component listens to Next.js
// pathname changes and emits ONE typed event per top-level surface:
//
//   - `/`                        → landing_viewed
//   - `/yo/langues/<lang>...`    → yopratiqo_landing_viewed
//   - `/admin/users`             → admin_users_viewed
//
// Other routes fire nothing here — pages instrument their own deeper
// events (search, booking, messaging) explicitly through the typed
// helpers in `lib/analytics/events.ts`. This keeps the page-view layer
// tiny and grep-able.
//
// Mounting: this component is rendered once inside `app/providers.tsx`
// so it runs for every route. It uses an effect keyed on pathname so we
// fire exactly one event per navigation (StrictMode-safe via a ref).

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  trackAdminUsersViewed,
  trackLandingViewed,
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
    // Guard against the React 18 StrictMode double-mount in dev. We only
    // want one event per real navigation.
    if (lastFiredRef.current === pathname) return;
    lastFiredRef.current = pathname;

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
