"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * Logged-out-only shell for the marketing landing.
 *
 * SEO contract: the children of this gate include the homepage's H1
 * (`LandingHeroStatic`), the LocalBusiness JSON-LD (`LandingOrgJsonLd`),
 * the public header/footer, and the SSR'd marketing surface. Therefore
 * the gate **must** render its children during the initial server render
 * and the first hydration pass — otherwise crawlers without JS execution
 * would receive an empty homepage body.
 *
 * The previous implementation returned `null` whenever the auth state was
 * still resolving (`authLoading: true`), which is the SSR initial state on
 * every request and dropped the entire SEO payload from the rendered HTML.
 *
 * Behaviour after this fix:
 *   - SSR / first paint: renders children (anonymous + signed-in alike).
 *   - Hydration → useAuth resolves to a signed-in user: the redirect
 *     useEffect navigates to /dashboard / /onboarding / /student/choose-companion
 *     and the gate hides children to avoid a flash of stale marketing.
 *   - Anonymous visitors: keep seeing the marketing landing.
 *
 * Trade-off: a signed-in user who hard-refreshes the homepage may briefly
 * see the marketing landing for one frame before the redirect takes over.
 * That is the same trade-off Airbnb / Booking-style marketplaces accept to
 * keep their homepage indexable.
 */
export function LandingAuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !user) return;
    const checkRole = async () => {
      const supabase = getSupabaseClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, teacher_onboarding_complete, companion_chosen")
        .eq("id", user.id)
        .maybeSingle();
      const row = profile as {
        role?: string | null;
        teacher_onboarding_complete?: boolean | null;
        companion_chosen?: boolean | null;
      } | null;
      if (row?.role === "teacher") {
        window.location.assign(row.teacher_onboarding_complete ? "/dashboard" : "/onboarding/teacher");
      } else if (!row?.companion_chosen) {
        window.location.assign("/student/choose-companion");
      } else {
        window.location.assign("/dashboard");
      }
    };
    void checkRole();
  }, [user, authLoading]);

  // Hide the marketing surface only once we are sure (post-hydration)
  // that the visitor is signed in. While auth is still resolving we
  // keep the SEO-critical content in the DOM so SSR is never empty.
  if (!authLoading && user) return null;
  return <>{children}</>;
}
