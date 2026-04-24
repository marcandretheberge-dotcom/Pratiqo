"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck2,
  Database,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  UserCircle2,
  UsersRound,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "./AuthProvider";
import { loginWithGoogle, logout } from "../lib/auth";
import { authAvatarUrl, authDisplayName } from "../lib/authDisplay";
import { getSupabaseClient } from "../lib/supabase";
import { fetchUnreadMessageCount } from "../lib/messaging";
import Logo from "./ui/Logo";
import { NotificationCenter } from "./NotificationCenter";

type NavItem = { href: string; label: string; teacherOnly?: boolean; groupSessionsNav?: boolean };

const NAV: NavItem[] = [
  { href: "/", label: "Accueil" },
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/student/search", label: "Recherche élève" },
  { href: "/group-sessions", label: "Cours de groupe", groupSessionsNav: true },
  { href: "/messages", label: "Messages" },
  { href: "/booking", label: "Réservation" },
  { href: "/teacher/profile", label: "Profil prof" },
  { href: "/teacher/settings", label: "Paramètres", teacherOnly: true },
  { href: "/supabase", label: "Supabase" },
];

const NAV_ICONS: Partial<Record<string, React.ReactNode>> = {
  "/dashboard": <LayoutDashboard size={18} />,
  "/student/search": <Search size={18} />,
  "/group-sessions": <UsersRound size={18} />,
  "/messages": <MessageCircle size={18} />,
  "/booking": <CalendarCheck2 size={18} />,
  "/teacher/profile": <UserCircle2 size={18} />,
  "/teacher/settings": <Settings size={18} />,
  "/supabase": <Database size={18} />,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setUnreadMessages(0);
      return;
    }

    const supabase = getSupabaseClient();
    const refresh = () => {
      void fetchUnreadMessageCount(supabase, user.id).then(setUnreadMessages);
    };
    void refresh();

    const channel = supabase
      .channel("app-shell-unread-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        refresh,
      );

    void channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <div className="min-h-[100dvh] text-[var(--p-text)] flex flex-col">
      <header className="bg-white border-b border-[var(--p-border-light)]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-10 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center">
            <Logo size="sm" variant="dark" />
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {NAV.filter((item) => !item.teacherOnly || profile?.role === "teacher").map((item) => {
              const resolvedHref =
                item.groupSessionsNav && profile?.role === "teacher"
                  ? "/teacher/group-sessions"
                  : item.href;
              const active = item.groupSessionsNav
                ? pathname.startsWith("/teacher/group-sessions") || pathname.startsWith("/group-sessions")
                : pathname === item.href ||
                  (item.href !== "/" && item.href !== "/dashboard" && pathname.startsWith(item.href));
              const icon = NAV_ICONS[item.href];
              const showUnread = item.href === "/messages" && unreadMessages > 0;
              return (
                <Link
                  key={item.href}
                  href={resolvedHref}
                  className={cn(
                    "px-4 py-2 rounded-[18px] text-sm font-medium transition-colors inline-flex items-center gap-2",
                    active
                      ? "bg-[var(--p-light-teal-bg)] text-[var(--p-dark-teal)]"
                      : "text-[var(--p-text-muted)] hover:text-[var(--p-text)] hover:bg-[rgba(225,245,238,0.6)]",
                  )}
                >
                  {icon}
                  <span className="inline-flex items-center gap-2">
                    {item.label}
                    {showUnread ? (
                      <span className="min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[#1D9E75] text-white text-[10px] font-bold leading-none inline-flex items-center justify-center">
                        {unreadMessages > 99 ? "99+" : unreadMessages}
                      </span>
                    ) : null}
                  </span>
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
              <div className="flex w-full min-w-0 flex-col gap-2.5 sm:w-auto sm:max-w-[min(100vw-2.5rem,340px)] sm:items-end">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left shadow-sm transition-colors hover:border-[#1D9E75]/40 hover:bg-[rgba(29,158,117,0.06)] sm:py-3">
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(e) => setLegalAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-1"
                    aria-describedby="legal-login-hint"
                  />
                  <span className="min-w-0 text-sm leading-snug text-[var(--p-text)]">
                    <span className="font-semibold text-[var(--p-text)]">
                      J&apos;accepte les CGU et la politique de confidentialité
                    </span>
                    <span className="mt-1 block text-xs font-normal text-[var(--p-text-muted)]">
                      Documents :{" "}
                      <Link
                        href="/legal/cgu"
                        className="font-medium text-[#1D9E75] underline underline-offset-2 hover:no-underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        CGU
                      </Link>
                      {" · "}
                      <Link
                        href="/legal/confidentialite"
                        className="font-medium text-[#1D9E75] underline underline-offset-2 hover:no-underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Politique de confidentialité
                      </Link>
                    </span>
                  </span>
                </label>
                <p id="legal-login-hint" className={cn("text-xs sm:text-right", legalAccepted ? "text-[var(--p-text-muted)]" : "font-medium text-amber-800")}>
                  {legalAccepted
                    ? "Tu peux te connecter avec Google."
                    : "Coche la case ci-dessus pour activer le bouton de connexion."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!legalAccepted) return;
                    void loginWithGoogle();
                  }}
                  disabled={!legalAccepted}
                  className="ds-btn-primary w-full text-sm sm:w-auto disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <LogIn size={16} /> Se connecter avec Google
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

      <footer className="border-t border-[var(--p-border-light)] bg-[var(--p-surface)] mt-auto">
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
        <div className="border-t border-[var(--p-border-light)] py-4 px-5 sm:px-10">
          <p className="text-center text-[11px] text-[var(--p-text-muted)] leading-relaxed">
            © 2026 Pratiqo inc. Tous droits réservés.
            <span className="mx-2 text-[var(--p-text-subtle)]">·</span>
            <Link href="/legal/confidentialite" className="hover:text-[#1D9E75] hover:underline">
              Politique de confidentialité
            </Link>
            <span className="mx-2 text-[var(--p-text-subtle)]">·</span>
            <Link href="/legal/cgu" className="hover:text-[#1D9E75] hover:underline">
              CGU
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

