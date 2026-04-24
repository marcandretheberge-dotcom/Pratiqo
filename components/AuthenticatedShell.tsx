"use client";

import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { AppShell } from "./AppShell";

const LEGAL_PREFIX = "/legal";

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLegal = pathname?.startsWith(LEGAL_PREFIX) ?? false;

  useEffect(() => {
    if (loading || isLegal || user) return;
    const next = pathname && pathname !== "/" ? pathname : "/dashboard";
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [loading, isLegal, user, pathname, router]);

  if (isLegal) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[var(--p-text-muted)]">
        <Loader2 className="h-9 w-9 animate-spin text-[#1D9E75]" />
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
