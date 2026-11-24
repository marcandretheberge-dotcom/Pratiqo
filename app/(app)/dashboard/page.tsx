"use client";

import React, { useEffect } from "react";
import { Dashboard } from "../../../components/Dashboard";
import { StudentDashboard } from "../../../components/StudentDashboard";
import { useAuth } from "../../../components/AuthProvider";
import {
  hasActivePendingTeacherIntentClient,
  resolvePendingTeacherOnboardingPath,
} from "@/lib/auth/preAuthOnboardingIntent";
import { pendingGuestBookingPath } from "@/lib/bookings/guestBookingIntent";
import { hasStudentOnboardingConsent } from "@/lib/auth/studentOnboardingConsent";
import { useRouter } from "next/navigation";
import { AppStudentDashboardSkeleton } from "@/components/loading/AppSkeletons";

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const role = (profile?.role as string | undefined) ?? undefined;
  const pendingTeacherIntent = !role && hasActivePendingTeacherIntentClient();

  useEffect(() => {
    if (role === "admin") {
      router.replace("/admin");
      return;
    }
    if (role === "teacher") return;
    if (role === "student") {
      const pending = pendingGuestBookingPath();
      if (pending && profile?.companion_chosen && hasStudentOnboardingConsent(profile)) router.replace(pending);
      return;
    }
    if (pendingTeacherIntent) {
      router.replace(resolvePendingTeacherOnboardingPath());
      return;
    }
    router.replace("/student/choose-companion");
  }, [role, pendingTeacherIntent, profile, router]);

  if (role === "admin" || pendingTeacherIntent) {
    return <AppStudentDashboardSkeleton className="min-h-[40vh]" />;
  }

  if (role === "teacher") {
    return <Dashboard />;
  }
  return <StudentDashboard />;
}
