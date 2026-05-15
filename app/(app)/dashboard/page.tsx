"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dashboard } from "../../../components/Dashboard";
import { StudentDashboard } from "../../../components/StudentDashboard";
import { useAuth } from "../../../components/AuthProvider";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../../lib/supabase";
import { getTeacherOnboardingMissingFields } from "../../../lib/teacherOnboarding";
import { DashboardGateSkeleton } from "../../../components/PratiqoLoadingStates";

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const role = (profile?.role as string | undefined) ?? undefined;
  const [teacherChecked, setTeacherChecked] = useState(false);
  const [teacherOk, setTeacherOk] = useState(true);

  const shouldCheckTeacher = role === "teacher";
  const shouldRedirectToOnboarding = useMemo(() => {
    if (!shouldCheckTeacher) return false;
    if (!teacherChecked) return false;
    return !teacherOk;
  }, [shouldCheckTeacher, teacherChecked, teacherOk]);

  useEffect(() => {
    if (role === "teacher") return;
    if (role === "student") return;
    // Unknown role: default to student interface.
    router.replace("/student/choose-companion");
  }, [role, router]);

  useEffect(() => {
    if (role !== "teacher") return;
    let cancelled = false;
    const supabase = getSupabaseClient();
    void (async () => {
      try {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("name, discipline, category, city, region, country_code, timezone, teaching_mode, price_per_lesson, availability")
          .eq("user_id", profile?.id)
          .maybeSingle();
        if (cancelled) return;
        const missing = getTeacherOnboardingMissingFields(teacher ?? null);
        setTeacherOk(missing.length === 0);
      } catch {
        if (!cancelled) setTeacherOk(false);
      } finally {
        if (!cancelled) setTeacherChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, profile?.id]);

  useEffect(() => {
    if (!shouldRedirectToOnboarding) return;
    router.replace("/onboarding/teacher");
  }, [shouldRedirectToOnboarding, router]);

  if (role === "teacher") {
    if (!teacherChecked || shouldRedirectToOnboarding) {
      return <DashboardGateSkeleton />;
    }
    return <Dashboard />;
  }
  return <StudentDashboard />;
}

