"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "./AuthProvider";
import { authDisplayName } from "../lib/authDisplay";
import { getSupabaseClient } from "../lib/supabase";
import { fetchUnreadMessageCount } from "../lib/messaging";
import Logo from "./ui/Logo";
import { useLocale } from "../lib/locale-context";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { TeacherTopNav } from "./TeacherTopNav";

type Role = "student" | "teacher" | string;

function isStudentNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/profile") return pathname === "/profile" || pathname.startsWith("/profile/");
  return pathname.startsWith(href);
}

function initialsFromDisplay(name: string | undefined, email: string | undefined): string {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase() || "?";
  }
  const one = parts[0] || base;
  return one.slice(0, 2).toUpperCase() || "?";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { user, profile } = useAuth();
  const role = profile?.role as Role | undefined;
  const isTeacher = role === "teacher";
  const isStudent = role === "student";

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

  const logoHref = !user ? "/" : isTeacher ? "/dashboard" : "/student/search";
  const studentDisplayName = (profile?.name as string | undefined) || (user ? authDisplayName(user) : "");
  const studentInitials = initialsFromDisplay(studentDisplayName, user?.email || undefined);

  const STUDENT_NAV: { href: string; labelKey: "studentTabFind" | "studentTabLessons" | "studentTabProgress" | "studentTabLearners" | "studentTabProfile" }[] = [
    { href: "/student/search", labelKey: "studentTabFind" },
    { href: "/dashboard", labelKey: "studentTabLessons" },
    { href: "/student/progress", labelKey: "studentTabProgress" },
    { href: "/student/learners", labelKey: "studentTabLearners" },
    { href: "/profile", labelKey: "studentTabProfile" },
  ];

  return (
    <div
      className={cn(
        "min-h-[100dvh] flex flex-col",
        isTeacher ? "bg-[#F4F4F3] text-[#2C2C2A]" : "bg-[#FAFCFB] text-[var(--p-text)]",
      )}
    >
      {isTeacher ? <TeacherTopNav unreadMessages={unreadMessages} /> : null}

      {/* Default top bar (non-student, non-teacher: logged-out or unknown role) */}
      {!isStudent && !isTeacher ? (
        <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-[var(--p-border-light)] bg-white flex items-center justify-between px-4 sm:px-5">
          <Link href={logoHref} className="flex items-center gap-2 min-w-0" aria-label={t("ariaHome")}>
            <Logo size="md" variant="dark" />
          </Link>
          <div className="shrink-0 origin-right scale-[0.98]">
            <LocaleSwitcher variant="light" />
          </div>
        </header>
      ) : null}

      {isStudent ? (
        <>
          {/* Student desktop: sticky header + horizontal tabs */}
          <header
            className="sticky top-0 z-50 hidden md:block shrink-0 bg-white"
            style={{
              borderBottom: "0.5px solid #D3D1C7",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 24px",
                height: 52,
              }}
            >
              <Link href="/student/search" className="shrink-0" aria-label={t("ariaHome")}>
                <Logo variant="dark" size="md" />
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Link
                  href="/messages"
                  className={cn(
                    "relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                    pathname?.startsWith("/messages")
                      ? "bg-[rgba(29,158,117,0.18)] text-[#0f6d52]"
                      : "text-[#0F6E56] hover:bg-[rgba(29,158,117,0.12)]",
                  )}
                  aria-label={t("ariaMessages")}
                >
                  <MessageCircle size={22} />
                  {unreadMessages > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none inline-flex items-center justify-center border-2 border-white">
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  ) : null}
                </Link>
                <div className="w-[min(200px,42vw)] shrink-0">
                  <LocaleSwitcher variant="light" />
                </div>
                <Link
                  href="/profile"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E1F5EE] text-xs font-bold text-[#085041]"
                  aria-label={t("studentTabProfile")}
                >
                  {studentInitials}
                </Link>
              </div>
            </div>
            <div
              className="hidden md:flex"
              style={{
                padding: "0 24px",
                borderTop: "0.5px solid #F1EFE8",
              }}
            >
              {STUDENT_NAV.map((tab) => {
                const active = isStudentNavActive(pathname, tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    style={{
                      padding: "10px 16px",
                      fontSize: 13,
                      fontWeight: active ? 500 : 400,
                      color: active ? "#0F6E56" : "#4B5563",
                      borderBottom: active ? "2px solid #0F6E56" : "2px solid transparent",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s",
                    }}
                  >
                    {t(tab.labelKey)}
                  </Link>
                );
              })}
            </div>
          </header>

          {/* Student mobile: minimal header */}
          <header
            className="sticky top-0 z-50 md:hidden shrink-0 flex items-center justify-between bg-white"
            style={{
              borderBottom: "0.5px solid #D3D1C7",
              padding: "0 16px",
              height: 52,
            }}
          >
            <Link href="/student/search" className="shrink-0" aria-label={t("ariaHome")}>
              <Logo variant="dark" size="sm" />
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link
                href="/messages"
                className={cn(
                  "relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  pathname?.startsWith("/messages")
                    ? "bg-[rgba(29,158,117,0.18)] text-[#0f6d52]"
                    : "text-[#0F6E56] hover:bg-[rgba(29,158,117,0.12)]",
                )}
                aria-label={t("ariaMessages")}
              >
                <MessageCircle size={20} />
                {unreadMessages > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none inline-flex items-center justify-center border-2 border-white">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                ) : null}
              </Link>
              <div className="w-[140px] shrink-0 origin-right sm:scale-100 scale-[0.94]">
                <LocaleSwitcher variant="light" compact />
              </div>
            </div>
          </header>
        </>
      ) : null}

      <div className={cn("flex flex-1 min-h-0", isTeacher && "flex-col")}>
        <main
          className={cn(
            "flex-1 min-w-0",
            isStudent && "w-full overflow-y-auto px-4 sm:px-5 py-6 md:pb-0 pb-20",
            isTeacher &&
              "w-full overflow-y-auto px-4 sm:px-6 py-6 pb-8 max-w-[1280px] mx-auto",
            !isStudent && !isTeacher && "overflow-y-auto px-4 sm:px-5 py-6 pb-8",
          )}
          style={
            isStudent
              ? {
                  flex: 1,
                  width: "100%",
                }
              : undefined
          }
        >
          {isStudent ? (
            <div className="w-full">{children}</div>
          ) : (
            <div className={cn("mx-auto w-full", !isTeacher && "max-w-[960px]", isTeacher && "w-full")}>{children}</div>
          )}
        </main>
      </div>

      {/* Student bottom tabs (mobile only) */}
      {isStudent ? (
        <>
          <style>{`
            .student-bottom-nav {
              display: flex;
            }
            @media (min-width: 768px) {
              .student-bottom-nav {
                display: none !important;
              }
            }
          `}</style>
        <nav
          className="student-bottom-nav"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: "white",
            borderTop: "0.5px solid #D3D1C7",
          }}
        >
          {[
            { href: "/student/search", icon: "🔍", labelKey: "studentTabFind" as const },
            { href: "/dashboard", icon: "📅", labelKey: "studentTabLessons" as const },
            { href: "/student/progress", icon: "🌱", labelKey: "studentTabProgress" as const },
            { href: "/student/learners", icon: "🎓", labelKey: "studentTabLearners" as const },
            { href: "/profile", icon: "👤", labelKey: "studentTabProfile" as const },
          ].map((tab) => {
            const active = isStudentNavActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "8px 4px",
                  textDecoration: "none",
                }}
              >
                <div style={{ fontSize: 20 }}>{tab.icon}</div>
                <div
                  style={{
                    fontSize: 10,
                    color: active ? "#0F6E56" : "#4B5563",
                    fontWeight: active ? 500 : 400,
                    marginTop: 2,
                  }}
                >
                  {t(tab.labelKey)}
                </div>
              </Link>
            );
          })}
        </nav>
        </>
      ) : null}

    </div>
  );
}

