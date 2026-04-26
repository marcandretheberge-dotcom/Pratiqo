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
import { NotificationCenter } from "./NotificationCenter";
import { useLocale } from "../lib/locale-context";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { TeacherShellNav } from "./TeacherShellNav";

type Role = "student" | "teacher" | string;

function normalizeTier(raw: string | null | undefined): string {
  const s = (raw || "bronze").toLowerCase();
  if (s === "argent" || s === "silver") return "Argent";
  if (s === "or" || s === "gold") return "Or";
  if (s === "platine" || s === "platinum") return "Platine";
  return "Bronze";
}

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
  const [loyaltyTier, setLoyaltyTier] = useState<string | null>(null);
  const [teacherStudentCount, setTeacherStudentCount] = useState<number | null>(null);
  const [teacherMoreOpen, setTeacherMoreOpen] = useState(false);

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
      setTeacherStudentCount(0);
      return;
    }
    const supabase = getSupabaseClient();
    const load = async () => {
      const [{ data }, { data: trow }] = await Promise.all([
        supabase.from("profiles").select("loyalty_tier, plan").eq("id", user.id).maybeSingle(),
        supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      setLoyaltyTier(normalizeTier((data as { loyalty_tier?: string | null } | null)?.loyalty_tier));
      if (trow) {
        const tid = (trow as { id?: string }).id;
        if (tid) {
          const { data: studs } = await supabase.from("bookings").select("student_id").eq("teacher_id", tid);
          const set = new Set<string>();
          for (const r of studs || []) {
            const sid = (r as { student_id?: string }).student_id;
            if (sid) set.add(sid);
          }
          setTeacherStudentCount(set.size);
        } else {
          setTeacherStudentCount(0);
        }
      } else {
        setTeacherStudentCount(0);
      }
    };
    void load();
  }, [isTeacher, user?.id]);

  const logoHref = !user ? "/" : isTeacher ? "/dashboard" : "/student/search";
  const studentDisplayName = (profile?.name as string | undefined) || (user ? authDisplayName(user) : "");
  const studentInitials = initialsFromDisplay(studentDisplayName, user?.email || undefined);

  const STUDENT_NAV: { href: string; labelKey: "studentTabFind" | "studentTabLessons" | "studentTabProgress" | "studentTabProfile" }[] = [
    { href: "/student/search", labelKey: "studentTabFind" },
    { href: "/dashboard", labelKey: "studentTabLessons" },
    { href: "/student/progress", labelKey: "studentTabProgress" },
    { href: "/profile", labelKey: "studentTabProfile" },
  ];

  return (
    <div
      className={cn(
        "min-h-[100dvh] flex flex-col",
        isTeacher ? "bg-[#F4F4F3] text-[#2C2C2A]" : "bg-[#FAFCFB] text-[var(--p-text)]",
      )}
    >
      {/* Default top bar (non-student) */}
      {!isStudent ? (
        <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-[var(--p-border-light)] bg-white flex items-center justify-between px-4 sm:px-5">
          <Link href={logoHref} className="flex items-center gap-2 min-w-0" aria-label={t("ariaHome")}>
            <Logo size="md" variant="dark" />
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            {isTeacher ? (
              <Link
                href="/messages"
                className={cn(
                  "relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                  pathname?.startsWith("/messages")
                    ? "bg-[rgba(29,158,117,0.18)] text-[#0f6d52]"
                    : "text-[#1D9E75] hover:bg-[rgba(29,158,117,0.12)]",
                )}
                aria-label={t("ariaMessages")}
              >
                <MessageCircle size={22} />
                {unreadMessages > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[#1D9E75] text-white text-[10px] font-bold leading-none inline-flex items-center justify-center border-2 border-white">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                ) : null}
              </Link>
            ) : null}
            <div className="opacity-80 scale-90 origin-right">
              <LocaleSwitcher />
            </div>
            {isTeacher ? (
              <div>
                <NotificationCenter />
              </div>
            ) : null}
          </div>
        </header>
      ) : (
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
                      : "text-[#1D9E75] hover:bg-[rgba(29,158,117,0.12)]",
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
                      color: active ? "#1D9E75" : "#888780",
                      borderBottom: active ? "2px solid #1D9E75" : "2px solid transparent",
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
                    : "text-[#1D9E75] hover:bg-[rgba(29,158,117,0.12)]",
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
              <div className="w-[140px] shrink-0 scale-90 origin-right">
                <LocaleSwitcher variant="light" compact />
              </div>
            </div>
          </header>
        </>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Teacher desktop sidebar */}
        {isTeacher ? (
          <aside
            className="hidden lg:flex w-[220px] shrink-0 border-r border-white/5 text-white"
            style={{
              background: "#2C2C2A",
              paddingTop: 0,
              paddingLeft: 14,
              paddingRight: 14,
              paddingBottom: 16,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Link
              href="/dashboard"
              className="min-w-0 shrink-0 text-white hover:opacity-95 transition-opacity"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
                marginTop: 0,
                textDecoration: "none",
              }}
              aria-label={t("ariaHome")}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#1D9E75",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 36 36" fill="none" aria-hidden>
                  <rect x="8" y="8" width="3.5" height="20" rx="1.75" fill="white" />
                  <path
                    d="M11.5 8 Q23 8 23 16 Q23 24 11.5 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="28" cy="21" r="2.5" fill="white" opacity="0.5" />
                  <circle cx="28" cy="16" r="2.5" fill="white" opacity="0.75" />
                  <circle cx="28" cy="11" r="2.5" fill="white" />
                </svg>
              </div>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: "white",
                  letterSpacing: "-0.3px",
                }}
              >
                Pratiqo
              </span>
            </Link>
            <TeacherShellNav unreadMessages={unreadMessages} loyaltyTier={loyaltyTier} studentCount={teacherStudentCount} />
            <div className="mt-auto pt-8 space-y-3 border-t border-white/10">
              <div className="opacity-80 scale-90 origin-left">
                <LocaleSwitcher />
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed px-1">© 2026 Pratiqo inc.</p>
            </div>
          </aside>
        ) : null}

        <main
          className={cn(
            "flex-1 min-w-0",
            isStudent && "w-full overflow-y-auto px-4 sm:px-5 py-6 md:pb-0 pb-20",
            isTeacher && "overflow-y-auto px-4 sm:px-6 py-6 pb-24 lg:pb-8",
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
            <div className={cn("mx-auto w-full", isTeacher ? "max-w-[1100px]" : "max-w-[960px]")}>{children}</div>
          )}
        </main>
      </div>

      {/* Student bottom tabs (mobile only) */}
      {isStudent ? (
        <nav
          className="safe-area-pb md:hidden"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: "white",
            borderTop: "0.5px solid #D3D1C7",
            display: "flex",
          }}
        >
          {[
            { href: "/student/search", icon: "🔍", labelKey: "studentTabFind" as const },
            { href: "/dashboard", icon: "📅", labelKey: "studentTabLessons" as const },
            { href: "/student/progress", icon: "🌱", labelKey: "studentTabProgress" as const },
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
                    color: active ? "#1D9E75" : "#888780",
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
      ) : null}

      {/* Teacher mobile: 5 tabs + More menu */}
      {isTeacher ? (
        <>
          <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[#2C2C2A] text-white safe-area-pb">
            <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
              <TeacherEmojiTab href="/dashboard" emoji="📊" label="Accueil" active={pathname === "/dashboard"} />
              <TeacherEmojiTab href="/teacher/schedule" emoji="📅" label="Cours" active={pathname?.startsWith("/teacher/schedule") ?? false} />
              <TeacherEmojiTab href="/teacher/progress" emoji="👥" label="Élèves" active={pathname?.startsWith("/teacher/progress") ?? false} />
              <TeacherEmojiTab href="/messages" emoji="💬" label="Messages" active={pathname?.startsWith("/messages") ?? false} badge={unreadMessages} />
              <button
                type="button"
                onClick={() => setTeacherMoreOpen(true)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
                  teacherMoreOpen || ["/loyalty", "/teacher/verification", "/teacher/settings"].some((p) => pathname?.startsWith(p))
                    ? "text-[#5DCAA5]"
                    : "text-white/70",
                )}
              >
                <span className="text-lg leading-none">⚙️</span>
                Plus
              </button>
            </div>
          </nav>
          {teacherMoreOpen ? (
            <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end bg-black/50" role="dialog" aria-modal>
              <button type="button" className="flex-1 min-h-0 w-full cursor-default" aria-label="Fermer" onClick={() => setTeacherMoreOpen(false)} />
              <div className="rounded-t-2xl bg-[#2C2C2A] text-white p-4 pb-safe space-y-1 border-t border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2 pb-2">Menu</p>
                <Link
                  href="/loyalty"
                  onClick={() => setTeacherMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-white/10"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-base">⭐</span>
                  <span className="flex-1">{t("loyalty")}</span>
                  {loyaltyTier ? <span className="text-xs text-[#5DCAA5]">{loyaltyTier}</span> : null}
                </Link>
                <Link
                  href="/teacher/verification"
                  onClick={() => setTeacherMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-white/10"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-base">🛡️</span>
                  <span>{t("verification")}</span>
                </Link>
                <Link
                  href="/teacher/settings"
                  onClick={() => setTeacherMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-white/10"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-base">⚙️</span>
                  <span>{t("settings")}</span>
                </Link>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

    </div>
  );
}

function TeacherEmojiTab({
  href,
  emoji,
  label,
  active,
  badge,
}: {
  href: string;
  emoji: string;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
        active ? "text-[#5DCAA5]" : "text-white/70 hover:text-white/90",
      )}
    >
      <span className="relative text-lg leading-none">
        {emoji}
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-2 min-w-[1rem] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  );
}
