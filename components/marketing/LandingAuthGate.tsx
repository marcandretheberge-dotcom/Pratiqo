"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * Logged-out-only shell for the marketing landing (same redirect behavior as the
 * previous monolithic landing client).
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

  if (authLoading) return null;
  if (user) return null;
  return <>{children}</>;
}
