"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, MessageCircle, Search, UserRound, UsersRound } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "./AuthProvider";
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
        <Link href={logoHref} className="flex items-center gap-2 min-w-0" aria-label={t("ariaHome")}>
          <Logo size="sm" variant={isTeacher ? "light" : "dark"} />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {isStudent ? (
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
          {isTeacher ? (
            <Link
              href="/messages"
              className={cn(
                "relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                pathname?.startsWith("/messages")
                  ? "bg-white/15 text-white"
                  : "text-white/85 hover:bg-white/10",
              )}
              aria-label={t("ariaMessages")}
            >
              <MessageCircle size={22} />
              {unreadMessages > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[#1D9E75] text-white text-[10px] font-bold leading-none inline-flex items-center justify-center border-2 border-[#2C2C2A]">
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

      {isStudent ? (
        <div className="hidden lg:block border-b border-[var(--p-border-light)] bg-white">
          <nav className="mx-auto max-w-[960px] px-4 sm:px-5 flex flex-wrap items-center gap-x-5 gap-y-1 min-h-11 text-sm font-semibold">
            <Link
              href="/student/search"
              className={cn(
                "border-b-2 -mb-px py-2.5 transition-colors",
                pathname?.startsWith("/student/search") ? "border-[#1D9E75] text-[#1D9E75]" : "border-transparent text-[var(--p-text-muted)] hover:text-[#1D9E75]",
              )}
            >
              {t("findTeacher")}
            </Link>
            <Link
              href="/group-sessions"
              className={cn(
                "border-b-2 -mb-px py-2.5 transition-colors",
                pathname?.startsWith("/group-sessions") ? "border-[#1D9E75] text-[#1D9E75]" : "border-transparent text-[var(--p-text-muted)] hover:text-[#1D9E75]",
              )}
            >
              {t("groupClasses")}
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                "border-b-2 -mb-px py-2.5 transition-colors",
                pathname === "/dashboard" ? "border-[#1D9E75] text-[#1D9E75]" : "border-transparent text-[var(--p-text-muted)] hover:text-[#1D9E75]",
              )}
            >
              {t("schedule")}
            </Link>
            <Link
              href="/student/progress"
              className={cn(
                "border-b-2 -mb-px py-2.5 transition-colors",
                pathname?.startsWith("/student/progress") ? "border-[#1D9E75] text-[#1D9E75]" : "border-transparent text-[var(--p-text-muted)] hover:text-[#1D9E75]",
              )}
            >
              {t("myProgress")}
            </Link>
            <Link
              href="/profile"
              className={cn(
                "border-b-2 -mb-px py-2.5 transition-colors",
                pathname === "/profile" ? "border-[#1D9E75] text-[#1D9E75]" : "border-transparent text-[var(--p-text-muted)] hover:text-[#1D9E75]",
              )}
            >
              {t("profile")}
            </Link>
            <Link
              href="/messages"
              className={cn(
                "border-b-2 -mb-px py-2.5 transition-colors",
                pathname?.startsWith("/messages") ? "border-[#1D9E75] text-[#1D9E75]" : "border-transparent text-[var(--p-text-muted)] hover:text-[#1D9E75]",
              )}
            >
              {t("messages")}
            </Link>
          </nav>
        </div>
      ) : null}

      <div className="flex flex-1 min-h-0">
        {/* Teacher desktop sidebar */}
        {isTeacher ? (
          <aside className="hidden lg:flex w-[220px] shrink-0 flex-col border-r border-white/5 bg-[#2C2C2A] text-white py-5 px-3">
            <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-1 min-w-0" aria-label={t("ariaHome")}>
              <Logo size="sm" variant="light" className="[&_span]:!text-white" />
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
            "flex-1 min-w-0 overflow-y-auto",
            isTeacher ? "pb-24 lg:pb-8 px-4 sm:px-6 py-6" : isStudent ? "pb-24 lg:pb-8 px-4 sm:px-5 py-6" : "pb-8 px-4 sm:px-5 py-6",
          )}
        >
          <div className={cn("mx-auto w-full", isTeacher ? "max-w-[1100px]" : "max-w-[960px]")}>{children}</div>
        </main>
      </div>

      {/* Student bottom tabs */}
      {isStudent ? (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-[var(--p-border-light)] bg-white safe-area-pb">
          <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
            <StudentTab href="/student/search" icon={<Search size={20} />} label={t("studentTabFindShort")} active={pathname?.startsWith("/student/search")} />
            <StudentTab href="/group-sessions" icon={<UsersRound size={20} />} label={t("studentTabGroups")} active={pathname?.startsWith("/group-sessions")} />
            <StudentTab href="/dashboard" icon={<CalendarDays size={20} />} label={t("studentTabCoursesShort")} active={pathname === "/dashboard"} />
            <StudentTab href="/student/progress" icon={<BookOpen size={20} />} label={t("studentTabProgressShort")} active={pathname?.startsWith("/student/progress")} />
            <StudentTab href="/profile" icon={<UserRound size={20} />} label={t("studentTabProfileShort")} active={pathname === "/profile"} />
          </div>
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
