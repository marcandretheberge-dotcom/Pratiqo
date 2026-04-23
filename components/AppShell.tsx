"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck2, Database, LayoutDashboard, LogIn, LogOut, Search, UserCircle2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "./AuthProvider";
import { loginWithGoogle, logout } from "../lib/auth";
import { authAvatarUrl, authDisplayName } from "../lib/authDisplay";
import Logo from "./ui/Logo";
import { NotificationCenter } from "./NotificationCenter";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/dashboard", label: "Tableau de bord", icon: <LayoutDashboard size={18} /> },
  { href: "/student/search", label: "Recherche élève", icon: <Search size={18} /> },
  { href: "/booking", label: "Réservation", icon: <CalendarCheck2 size={18} /> },
  { href: "/teacher/profile", label: "Profil prof", icon: <UserCircle2 size={18} /> },
  { href: "/supabase", label: "Supabase", icon: <Database size={18} /> },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [legalAccepted, setLegalAccepted] = useState(false);

  return (
    <div className="min-h-[100dvh] text-[var(--p-text)] flex flex-col">
      <header className="bg-white border-b border-[var(--p-border-light)]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-10 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center">
            <Logo size="sm" variant="dark" />
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-[18px] text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--p-light-teal-bg)] text-[var(--p-dark-teal)]"
                      : "text-[var(--p-text-muted)] hover:text-[var(--p-text)] hover:bg-[rgba(225,245,238,0.6)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <NotificationCenter />
            {user ? (
              <div className="hidden sm:flex items-center gap-3">
                <img
                  src={
                    authAvatarUrl(user) ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(authDisplayName(user))}`
                  }
                  className="w-9 h-9 rounded-full border border-[var(--p-border-light)]"
                  alt=""
                  referrerPolicy="no-referrer"
                />
                <div className="hidden lg:block leading-tight">
                  <p className="text-sm font-medium text-[var(--p-text)] truncate max-w-[200px]">
                    {authDisplayName(user)}
                  </p>
                  <p className="text-xs text-[var(--p-text-muted)] capitalize">
                    {profile?.role || "Élève"}
                  </p>
                </div>
                <button
                  onClick={() => logout()}
                  className="ds-btn-secondary text-sm"
                  title="Déconnexion"
                >
                  <span className="inline-flex items-center gap-2">
                    <LogOut size={16} /> Déconnexion
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-2 max-w-[min(100vw-2.5rem,280px)]">
                <label className="flex items-start gap-2 text-left text-[11px] text-[var(--p-text-muted)] leading-snug cursor-pointer">
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(e) => setLegalAccepted(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#1D9E75] focus:ring-[#1D9E75]"
                  />
                  <span>
                    J&apos;accepte les{" "}
                    <Link href="/legal/cgu" className="text-[#1D9E75] underline font-medium">
                      CGU
                    </Link>{" "}
                    et la{" "}
                    <Link href="/legal/confidentialite" className="text-[#1D9E75] underline font-medium">
                      politique de confidentialité
                    </Link>
                    .
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!legalAccepted) return;
                    void loginWithGoogle();
                  }}
                  disabled={!legalAccepted}
                  className="ds-btn-primary text-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="inline-flex items-center gap-2">
                    <LogIn size={16} /> Se connecter
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-10 py-12">{children}</div>
      </main>

      <footer className="border-t border-[var(--p-border-light)] bg-white mt-auto">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-10 py-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--p-text-muted)]">
          <Link href="/legal/cgu" className="hover:text-[#1D9E75] hover:underline">
            CGU
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/legal/confidentialite" className="hover:text-[#1D9E75] hover:underline">
            Confidentialité
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/legal/annulation" className="hover:text-[#1D9E75] hover:underline">
            Annulation
          </Link>
        </div>
      </footer>
    </div>
  );
}

