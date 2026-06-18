"use client";

import React, { useEffect } from "react";
import { Dashboard } from "../../../components/Dashboard";
import { StudentDashboard } from "../../../components/StudentDashboard";
import { useAuth } from "../../../components/AuthProvider";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const role = (profile?.role as string | undefined) ?? undefined;

  useEffect(() => {
    if (role === "admin") {
      router.replace("/admin");
      return;
    }
    if (role === "teacher") return;
    if (role === "student") return;
    // Unknown role: default to student interface.
    router.replace("/student/choose-companion");
  }, [role, router]);

  if (role === "admin") {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-[var(--p-text-muted)]">
        Chargement…
      </div>
    );
  }

  if (role === "teacher") {
    return <Dashboard />;
  }
  return <StudentDashboard />;
}
