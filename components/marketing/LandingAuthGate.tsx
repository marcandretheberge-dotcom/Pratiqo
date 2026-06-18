"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import {
  clearPendingTeacherOnboardingCookie,
  hasPendingTeacherIntentClient,
  resolveLoginHrefWithPendingTeacherIntent,
} from "@/lib/auth/pendingTeacherIntent";
import { buildOnboardingRoleChoicePath } from "@/lib/auth/onboardingRoleChoice";
import { resolvePostAuthRedirect } from "@/lib/auth/postAuthRedirect";

/**
 * Logged-out-only shell for the marketing landing.
 */
export function LandingAuthGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      if (hasPendingTeacherIntentClient()) {
        window.location.assign(resolveLoginHrefWithPendingTeacherIntent());
      }
      return;
    }

    const checkRole = async () => {
      const supabase = getSupabaseClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, teacher_onboarding_complete, companion_chosen, dashboard")
        .eq("id", user.id)
        .maybeSingle();
      const row = profile as {
        role?: string | null;
        teacher_onboarding_complete?: boolean | null;
        companion_chosen?: boolean | null;
        dashboard?: unknown;
      } | null;

      const pendingTeacher = hasPendingTeacherIntentClient();
      const redirectPath = resolvePostAuthRedirect(
        row?.role === "admin" || row?.role === "teacher" || row?.role === "student" ? row.role : "student",
        {
          teacher_onboarding_complete: row?.teacher_onboarding_complete,
          companion_chosen: row?.companion_chosen,
          dashboard: row?.dashboard,
        },
        pendingTeacher ? buildOnboardingRoleChoicePath(true) : null,
      );

      if (!redirectPath.startsWith("/onboarding/choose-role")) {
        clearPendingTeacherOnboardingCookie();
      }
      window.location.assign(redirectPath);
    };
    void checkRole();
  }, [user, authLoading]);

  if (!authLoading && user) return null;
  return <>{children}</>;
}
