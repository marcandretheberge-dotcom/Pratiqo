"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Gift,
  LayoutDashboard,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "./AuthProvider";
import { logout } from "../lib/auth";
import { getSupabaseClient } from "../lib/supabase";
import { fetchUnreadMessageCount } from "../lib/messaging";
import Logo from "./ui/Logo";
import { NotificationCenter } from "./NotificationCenter";
import { VerificationBadge } from "./VerificationBadge";
import { getVerificationLevel, type VerificationLevel } from "../lib/verification";

type Role = "student" | "teacher" | string;

function normalizeTier(raw: string | null | undefined): string {
  const s = (raw || "bronze").toLowerCase();
  if (s === "argent" || s === "silver") return "Argent";
  if (s === "or" || s === "gold") return "Or";
  if (s === "platine" || s === "platinum") return "Platine";
  return "Bronze";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const role = (profile?.role as Role) || "student";
  const isTeacher = role === "teacher";

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loyaltyTier, setLoyaltyTier] = useState<string | null>(null);
  const [teacherVerifyLevel, setTeacherVerifyLevel] = useState<VerificationLevel | null>(null);

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
      .channel("shell-unread-msg")
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

  useEffect(() => {
    if (!isTeacher || !user?.id) {
      setLoyaltyTier(null);
      setTeacherVerifyLevel(null);
      return;
    }
    const supabase = getSupabaseClient();
    const load = async () => {
      const [{ data }, { data: trow }] = await Promise.all([
        supabase.from("profiles").select("loyalty_tier, plan").eq("id", user.id).maybeSingle(),
        supabase
          .from("teachers")
          .select("verification_level, identity_verified, diploma_verified, is_verified")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      setLoyaltyTier(normalizeTier((data as { loyalty_tier?: string | null } | null)?.loyalty_tier));
      const plan = String((data as { plan?: string | null } | null)?.plan || "free");
      if (trow) {
        const tr = trow as {
          verification_level?: number | null;
          identity_verified?: boolean | null;
          diploma_verified?: boolean | null;
          is_verified?: boolean | null;
        };
        setTeacherVerifyLevel(
          getVerificationLevel({
            plan,
            identity_verified: Boolean(tr.identity_verified),
            diploma_verified: Boolean(tr.diploma_verified),
            is_verified: tr.is_verified !== false,
            verification_level: tr.verification_level ?? null,
          }),
        );
      } else {
        setTeacherVerifyLevel(null);
      }
    };
    void load();
  }, [isTeacher, user?.id]);

  const logoHref = isTeacher ? "/dashboard" : "/dashboard";

  return (
    <div
      className={cn(
        "min-h-[100dvh] flex flex-col",
        isTeacher ? "bg-[#F4F4F3] text-[#2C2C2A]" : "bg-[#FAFCFB] text-[var(--p-text)]",
      )}
    >
      {/* Top bar */}
      <header
        className={cn(
          "sticky top-0 z-40 h-14 shrink-0 border-b flex items-center justify-between px-4 sm:px-5",
          isTeacher ? "border-[#2C2C2A]/10 bg-[#2C2C2A] text-white" : "border-[var(--p-border-light)] bg-white",
        )}
      >
        <Link href={logoHref} className="flex items-center gap-2 min-w-0">
          <Logo size="sm" variant={isTeacher ? "light" : "dark"} />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {!isTeacher ? (
            <Link
              href="/messages"
              className={cn(
                "relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                pathname?.startsWith("/messages")
                  ? "bg-[rgba(29,158,117,0.18)] text-[#0f6d52]"
                  : "text-[#1D9E75] hover:bg-[rgba(29,158,117,0.12)]",
              )}
              aria-label="Messages"
            >
              <MessageCircle size={22} />
              {unreadMessages > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[#1D9E75] text-white text-[10px] font-bold leading-none inline-flex items-center justify-center border-2 border-white">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              ) : null}
            </Link>
          ) : null}
          <div
            className={
              isTeacher
                ? "[&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:hover:bg-white/15 [&_svg]:text-white/90"
                : ""
            }
          >
            <NotificationCenter />
          </div>
        </div>
      </header>

      {!isTeacher ? (
        <div className="hidden lg:block border-b border-[var(--p-border-light)] bg-white">
          <nav className="mx-auto max-w-[960px] px-5 flex items-center gap-8 h-11 text-sm font-semibold">
            <Link
              href="/student/search"
              className={cn(
                "border-b-2 -mb-px pb-2.5 transition-colors",
                pathname?.startsWith("/student/search") ? "border-[#1D9E75] text-[#1D9E75]" : "border-transparent text-[var(--p-text-muted)] hover:text-[#1D9E75]",
              )}
            >
              Trouver
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                "border-b-2 -mb-px pb-2.5 transition-colors",
                pathname === "/dashboard" ? "border-[#1D9E75] text-[#1D9E75]" : "border-transparent text-[var(--p-text-muted)] hover:text-[#1D9E75]",
              )}
            >
              Mes cours
            </Link>
            <Link
              href="/profile"
              className={cn(
                "border-b-2 -mb-px pb-2.5 transition-colors",
                pathname === "/profile" ? "border-[#1D9E75] text-[#1D9E75]" : "border-transparent text-[var(--p-text-muted)] hover:text-[#1D9E75]",
              )}
            >
              Profil
            </Link>
          </nav>
        </div>
      ) : null}

      <div className="flex flex-1 min-h-0">
        {/* Teacher desktop sidebar */}
        {isTeacher ? (
          <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-[#2C2C2A]/10 bg-[#2C2C2A] text-white py-4 px-2">
            <nav className="flex flex-col gap-1">
              <TeacherNavLink href="/dashboard" label="Dashboard" active={pathname === "/dashboard"} />
              <TeacherNavLink href="/teacher/progress" label="Agenda & Élèves" active={pathname?.startsWith("/teacher/progress")} />
              <TeacherNavLink
                href="/teacher/group-sessions"
                label="Cours de groupe"
                active={pathname?.startsWith("/teacher/group-sessions")}
              />
              <TeacherNavLink
                href="/teacher/verification"
                label="Vérification"
                active={pathname?.startsWith("/teacher/verification")}
                icon={<ShieldCheck size={18} className="opacity-90 shrink-0" />}
                extra={
                  teacherVerifyLevel !== null ? (
                    <VerificationBadge level={teacherVerifyLevel} size="sm" showLabel={false} />
                  ) : null
                }
              />
              <TeacherNavLink href="/messages" label="Messages" active={pathname?.startsWith("/messages")} badge={unreadMessages} />
              <TeacherNavLink
                href="/loyalty"
                label="Fidélité"
                active={pathname?.startsWith("/loyalty")}
                pill={loyaltyTier}
              />
              <TeacherNavLink href="/teacher/settings" label="Paramètres" active={pathname?.startsWith("/teacher/settings")} />
            </nav>
            <div className="mt-auto pt-6 px-2 space-y-2 border-t border-white/10">
              <Link href="/legal/cgu" className="block text-[11px] text-white/60 hover:text-white/90">
                CGU
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="w-full text-left text-xs font-semibold text-white/80 hover:text-white py-2"
              >
                Déconnexion
              </button>
            </div>
          </aside>
        ) : null}

        <main
          className={cn(
            "flex-1 min-w-0 overflow-y-auto",
            isTeacher ? "pb-24 lg:pb-8 px-4 sm:px-6 py-6" : "pb-24 lg:pb-8 px-4 sm:px-5 py-6",
          )}
        >
          <div className={cn("mx-auto w-full", isTeacher ? "max-w-[1100px]" : "max-w-[960px]")}>{children}</div>
        </main>
      </div>

      {/* Student bottom tabs */}
      {!isTeacher ? (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[var(--p-border-light)] bg-white safe-area-pb">
          <div className="grid grid-cols-3 h-16 max-w-lg mx-auto">
            <StudentTab href="/student/search" icon={<Search size={22} />} label="Trouver" active={pathname?.startsWith("/student/search")} />
            <StudentTab href="/dashboard" icon={<CalendarDays size={22} />} label="Mes cours" active={pathname === "/dashboard"} />
            <StudentTab href="/profile" icon={<UserRound size={22} />} label="Profil" active={pathname === "/profile"} />
          </div>
        </nav>
      ) : null}

      {/* Teacher mobile bottom tabs */}
      {isTeacher ? (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[#2C2C2A]/20 bg-[#2C2C2A] text-white safe-area-pb overflow-x-auto">
          <div className="flex min-w-max px-1 h-16 items-stretch">
            <TeacherTab href="/dashboard" icon={<LayoutDashboard size={20} />} label="Accueil" active={pathname === "/dashboard"} />
            <TeacherTab href="/teacher/progress" icon={<CalendarDays size={20} />} label="Agenda" active={pathname?.startsWith("/teacher/progress")} />
            <TeacherTab href="/teacher/group-sessions" icon={<UsersRound size={20} />} label="Groupes" active={pathname?.startsWith("/teacher/group-sessions")} />
            <TeacherTab
              href="/teacher/verification"
              icon={<ShieldCheck size={20} />}
              label="Vérif."
              active={pathname?.startsWith("/teacher/verification")}
              suffix={
                teacherVerifyLevel !== null ? (
                  <VerificationBadge level={teacherVerifyLevel} size="sm" showLabel={false} className="scale-90" />
                ) : null
              }
            />
            <TeacherTab href="/messages" icon={<MessageCircle size={20} />} label="Messages" active={pathname?.startsWith("/messages")} badge={unreadMessages} />
            <TeacherTab href="/loyalty" icon={<Gift size={20} />} label="Fidélité" active={pathname?.startsWith("/loyalty")} pill={loyaltyTier} />
            <TeacherTab href="/teacher/settings" icon={<Settings size={20} />} label="Réglages" active={pathname?.startsWith("/teacher/settings")} />
          </div>
        </nav>
      ) : null}

    </div>
  );
}

function StudentTab({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
        active ? "text-[#1D9E75]" : "text-[var(--p-text-muted)] hover:text-[#1D9E75]",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function TeacherTab({
  href,
  icon,
  label,
  active,
  badge,
  pill,
  suffix,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  pill?: string | null;
  suffix?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center min-w-[4.25rem] px-1.5 gap-0.5 text-[9px] font-semibold transition-colors border-r border-white/10 last:border-0",
        active ? "text-[#7FE0C3] bg-white/5" : "text-white/75 hover:text-white",
      )}
    >
      <span className="relative">
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-2 min-w-[1rem] h-4 px-0.5 rounded-full bg-[#1D9E75] text-white text-[9px] font-bold flex items-center justify-center">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span className="flex flex-col items-center gap-0.5">
        <span className="flex items-center gap-0.5">
          {label}
          {pill ? <span className="text-[8px] opacity-80">({pill})</span> : null}
        </span>
        {suffix}
      </span>
    </Link>
  );
}

function TeacherNavLink({
  href,
  label,
  active,
  badge,
  pill,
  icon,
  extra,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
  pill?: string | null;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-white/12 text-white" : "text-white/80 hover:bg-white/8 hover:text-white",
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="truncate">{label}</span>
        {extra}
      </span>
      <span className="flex items-center gap-1 shrink-0">
        {pill ? (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-[#1D9E75]/30 text-[#B8F5DC]">
            {pill}
          </span>
        ) : null}
        {badge && badge > 0 ? (
          <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-[#1D9E75] text-white text-[11px] font-bold flex items-center justify-center">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
