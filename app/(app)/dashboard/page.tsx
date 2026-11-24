"use client";

import React, { useEffect } from "react";
import { Dashboard } from "../../../components/Dashboard";
import { StudentDashboard } from "../../../components/StudentDashboard";
import { useAuth } from "../../../components/AuthProvider";
import {
  hasActivePendingTeacherIntentClient,
  resolvePendingTeacherOnboardingPath,
} from "@/lib/auth/preAuthOnboardingIntent";
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
    if (role === "student") return;
    if (pendingTeacherIntent) {
      router.replace(resolvePendingTeacherOnboardingPath());
      return;
    }
    router.replace("/student/choose-companion");
  }, [role, pendingTeacherIntent, router]);

  if (role === "admin" || pendingTeacherIntent) {
    return <AppStudentDashboardSkeleton className="min-h-[40vh]" />;
  }

  if (role === "teacher") {
    return <Dashboard />;
  }
  return <StudentDashboard />;
}
