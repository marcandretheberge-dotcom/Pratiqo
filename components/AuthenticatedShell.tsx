"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { AppShell } from "./AppShell";
import { AuthShellLoading, RedirectingToLogin } from "./PratiqoLoadingStates";

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

function adminForbiddenPath(pathname: string) {
  if (pathname.startsWith("/student")) return true;
  if (pathname.startsWith("/teacher")) return true;
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  if (pathname.startsWith("/onboarding")) return true;
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
      if (pathname.startsWith("/onboarding")) {
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
      return;
    }

    if (role === "admin") {
      if (adminForbiddenPath(pathname)) {
        router.replace("/admin/operations");
      }
    }
  }, [loading, isLegal, user, pathname, router, profile?.role]);

  useEffect(() => {
    if (loading || isLegal || user) return;
    const next = pathname && pathname !== "/" ? pathname : "/dashboard";
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [loading, isLegal, user, pathname, router]);

  if (isLegal) {
    return <>{children}</>;
  }

  if (loading) {
    return <AuthShellLoading />;
  }

  if (!user) {
    return <RedirectingToLogin />;
  }

  return <AppShell>{children}</AppShell>;
}
