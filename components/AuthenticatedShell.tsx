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
import { buildLoginHrefForProtectedReturn, hasActivePendingTeacherIntentClient } from "@/lib/auth/preAuthOnboardingIntent";
import { logAuthFlowDecision } from "@/lib/auth/authFlowDiagnostics";
import { hasStudentOnboardingConsent } from "@/lib/auth/studentOnboardingConsent";

const LEGAL_PREFIX = "/legal";

function isResolvedRole(role: string | undefined): role is "student" | "teacher" | "admin" {
  return role === "student" || role === "teacher" || role === "admin";
}

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
  const { user, loading, profile, profileHydrated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLegal = pathname?.startsWith(LEGAL_PREFIX) ?? false;

  useEffect(() => {
    if (loading || isLegal || !user || !pathname) return;

    const role = profile?.role as string | undefined;

    if (!isResolvedRole(role)) {
      if (
        pathname.startsWith("/student") ||
        isOnboardingRoleChoicePath(pathname) ||
        pathname.startsWith("/onboarding/teacher")
      ) {
        logAuthFlowDecision("authenticated-shell", {
          guard: "wait-unresolved-role",
          path: pathname,
          profileRole: role ?? "null",
        });
        return;
      }

      const pendingTeacherIntent = hasActivePendingTeacherIntentClient();
      if (pendingTeacherIntent) {
        logAuthFlowDecision("authenticated-shell", {
          guard: "teacher-pending-intent-dashboard",
          path: pathname,
          profileRole: role ?? "null",
          redirect: "/dashboard",
        });
        router.replace("/dashboard");
        return;
      }

      logAuthFlowDecision("authenticated-shell", {
        guard: "role-choice-fallback",
        path: pathname,
        profileRole: role ?? "null",
        redirect: ONBOARDING_ROLE_CHOICE_PATH,
      });
      router.replace(ONBOARDING_ROLE_CHOICE_PATH);
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

      if (profileHydrated && profile?.companion_chosen === false && pathname !== "/student/choose-companion") {
        router.replace("/student/choose-companion");
        return;
      }
      const studentConsentComplete = hasStudentOnboardingConsent(profile);
      if (
        profileHydrated &&
        profile?.companion_chosen === true &&
        !studentConsentComplete &&
        pathname !== "/student/consent"
      ) {
        router.replace("/student/consent");
        return;
      }
      if (profileHydrated && studentConsentComplete && pathname === "/student/consent") {
        router.replace("/dashboard");
        return;
      }
      if (profileHydrated && profile?.companion_chosen === true && pathname === "/student/choose-companion") {
        router.replace("/dashboard");
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
        logAuthFlowDecision("authenticated-shell", {
          guard: "teacher-student-path",
          path: pathname,
          profileRole: role,
          redirect: "/dashboard",
        });
        router.replace("/dashboard");
      }
    }
  }, [loading, isLegal, user, pathname, router, profile?.role, profile?.companion_chosen, profile?.teacher_onboarding_complete, profileHydrated, profile]);

  useEffect(() => {
    if (loading || isLegal || user) return;
    const next = pathname && pathname !== "/" ? pathname : "/dashboard";
    router.replace(buildLoginHrefForProtectedReturn(next));
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
