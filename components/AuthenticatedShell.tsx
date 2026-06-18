"use client";

import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { AppShell } from "./AppShell";
import {
  isOnboardingRoleChoicePath,
  needsOnboardingRoleChoice,
  ONBOARDING_ROLE_CHOICE_PATH,
  resolveProfileDashboardFromAuth,
} from "@/lib/auth/onboardingRoleChoice";
import { buildConnexionHrefForProtectedReturn } from "@/lib/auth/preAuthOnboardingIntent";

const LEGAL_PREFIX = "/legal";

function studentForbiddenPath(pathname: string) {
  if (pathname === "/loyalty" || pathname.startsWith("/loyalty/")) return true;
  if (pathname.startsWith("/teacher/settings")) return true;
  if (pathname.startsWith("/teacher/progress")) return true;
  if (pathname.startsWith("/teacher/group-sessions")) return true;
  if (pathname.startsWith("/teacher/verification")) return true;
  if (pathname.startsWith("/teacher/")) return true;
  return false;
}

function teacherForbiddenPath(pathname: string) {
  if (pathname.startsWith("/student")) return true;
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  return false;
}

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLegal = pathname?.startsWith(LEGAL_PREFIX) ?? false;

  useEffect(() => {
    if (loading || isLegal || !user || !pathname) return;

    const role = profile?.role as string | undefined;

    if (role !== "teacher" && role !== "student" && role !== "admin") {
      if (!pathname.startsWith("/onboarding")) {
        router.replace("/onboarding");
      }
      return;
    }

    if (role === "student") {
      const needsRoleChoice = needsOnboardingRoleChoice({
        role,
        companion_chosen: profile?.companion_chosen,
        teacher_onboarding_complete: profile?.teacher_onboarding_complete,
        dashboard: resolveProfileDashboardFromAuth(profile as Record<string, unknown> | null),
      });

      if (needsRoleChoice) {
        if (!isOnboardingRoleChoicePath(pathname)) {
          router.replace(ONBOARDING_ROLE_CHOICE_PATH);
        }
        return;
      }

      if (profile?.companion_chosen === false && pathname !== "/student/choose-companion") {
        router.replace("/student/choose-companion");
        return;
      }
      if (pathname.startsWith("/onboarding") && !isOnboardingRoleChoicePath(pathname)) {
        router.replace("/dashboard");
        return;
      }
      if (studentForbiddenPath(pathname)) {
        router.replace("/dashboard");
      }
      return;
    }

    if (role === "teacher") {
      if (teacherForbiddenPath(pathname)) {
        router.replace("/dashboard");
      }
    }
  }, [loading, isLegal, user, pathname, router, profile?.role, profile?.companion_chosen, profile?.teacher_onboarding_complete, profile]);

  useEffect(() => {
    if (loading || isLegal || user) return;
    const next = pathname && pathname !== "/" ? pathname : "/dashboard";
    router.replace(buildConnexionHrefForProtectedReturn(next));
  }, [loading, isLegal, user, pathname, router]);

  if (isLegal) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[var(--p-text-muted)]">
        <Loader2 className="h-9 w-9 animate-spin text-teal-700" />
        <p className="text-sm font-medium">Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-[var(--p-text-muted)]">
        <p>Redirection vers la connexion…</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
