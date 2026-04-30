"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Shield,
  Star,
  User,
  Users,
  X,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/Logo";
import { NotificationCenter } from "@/components/NotificationCenter";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useLocale } from "@/lib/locale-context";
import { useAuth } from "@/components/AuthProvider";
import { authDisplayName } from "@/lib/authDisplay";
import { logout } from "@/lib/auth";

function initialsFrom(name: string | undefined, email: string | undefined): string {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase() || "?";
  return base.slice(0, 2).toUpperCase() || "?";
}

function isTeacherNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/teacher/my-profile") return pathname.startsWith("/teacher/my-profile");
  if (href === "/teacher/settings") return pathname.startsWith("/teacher/settings");
  if (href === "/teacher/schedule") return pathname.startsWith("/teacher/schedule");
  if (href === "/teacher/progress") return pathname.startsWith("/teacher/progress");
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavItem = { href: string; labelKey: "teacherDashboard" | "teacherSchedule" | "teacherStudents" | "teacherMessages" | "teacherLoyalty" | "teacherVerification" };

const DESKTOP_NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "teacherDashboard" },
  { href: "/teacher/schedule", labelKey: "teacherSchedule" },
  { href: "/teacher/progress", labelKey: "teacherStudents" },
  { href: "/messages", labelKey: "teacherMessages" },
  { href: "/loyalty", labelKey: "teacherLoyalty" },
  { href: "/teacher/verification", labelKey: "teacherVerification" },
];

export function TeacherTopNav({
  unreadMessages,
}: {
  unreadMessages: number;
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { user, profile } = useAuth();
  const displayName = (profile?.name as string | undefined) || (user ? authDisplayName(user) : "");
  const photoUrl = (profile?.photo_url as string | null | undefined) ?? null;
  const initials = initialsFrom(displayName, user?.email || undefined);

  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!avatarOpen) return;
    const close = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [avatarOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setAvatarOpen(false);
  }, [pathname]);

  const navLinkClass = (href: string, extra?: string) =>
    cn(
      "inline-flex items-center gap-1.5 text-sm font-semibold py-3 px-2 border-b-2 transition-colors whitespace-nowrap",
      extra,
      isTeacherNavActive(pathname, href)
        ? "text-[#00694c] border-[#00694c]"
        : "text-slate-600 border-transparent hover:text-[#00694c] hover:border-slate-200",
    );

  return (
    <>
      <header
        className="sticky top-0 z-[55] w-full border-b border-slate-200/80 backdrop-blur-md bg-white/85 supports-[backdrop-filter]:bg-white/65"
        style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}
      >
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 sm:px-5">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 text-slate-700 md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label={t("teacherTopNavMenu")}
          >
            <Menu size={22} />
          </button>

          <Link href="/dashboard" className="shrink-0 flex items-center gap-2 min-w-0" aria-label={t("ariaHome")}>
            <Logo variant="dark" size="sm" className="md:hidden" />
            <Logo variant="dark" size="md" className="hidden md:block" />
          </Link>

          <nav className="hidden md:flex flex-1 items-center gap-1 min-w-0 overflow-x-auto px-2" aria-label="Teacher">
            {DESKTOP_NAV.map((item) => {
              const Icon =
                item.href === "/dashboard"
                  ? LayoutDashboard
                  : item.href === "/teacher/schedule"
                    ? Calendar
                    : item.href === "/teacher/progress"
                      ? Users
                      : item.href === "/messages"
                        ? MessageCircle
                        : item.href === "/loyalty"
                          ? Star
                          : Shield;
              return (
                <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                  <Icon size={16} className="opacity-80 shrink-0" aria-hidden />
                  {t(item.labelKey)}
                  {item.href === "/messages" && unreadMessages > 0 ? (
                    <span className="ml-0.5 min-w-[1.125rem] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden sm:block w-[min(160px,28vw)]">
              <LocaleSwitcher variant="light" compact />
            </div>
            <NotificationCenter />
            <div className="relative" ref={dropRef}>
              <button
                type="button"
                onClick={() => setAvatarOpen((o) => !o)}
                className="flex items-center gap-1 rounded-full border border-slate-200/90 py-1 pl-1 pr-2 hover:bg-slate-50 transition-colors"
                aria-expanded={avatarOpen}
                aria-haspopup="menu"
              >
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white border border-white shadow-sm"
                    style={{ backgroundColor: "#1D9E75" }}
                  >
                    {initials}
                  </div>
                )}
                <ChevronDown size={16} className="text-slate-500 hidden sm:block" />
              </button>
              {avatarOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg z-50"
                  style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.08)" }}
                >
                  <Link
                    href="/teacher/my-profile"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    role="menuitem"
                    onClick={() => setAvatarOpen(false)}
                  >
                    <User size={16} className="text-[#00694c]" />
                    {t("teacherNavMyProfile")}
                  </Link>
                  <Link
                    href="/teacher/settings"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    role="menuitem"
                    onClick={() => setAvatarOpen(false)}
                  >
                    {t("settings")}
                  </Link>
                  <Link
                    href="/teacher/verification"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 md:hidden"
                    role="menuitem"
                    onClick={() => setAvatarOpen(false)}
                  >
                    <Shield size={16} className="text-slate-500" />
                    {t("teacherVerification")}
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors"
                    role="menuitem"
                    onClick={() => void logout()}
                  >
                    {t("signOut")}
                  </button>
                  <div className="border-t border-slate-100 px-3 py-2 sm:hidden">
                    <LocaleSwitcher variant="light" compact />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[65] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("bannerDismiss")}
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[min(100%,320px)] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 h-14">
              <span className="text-sm font-bold text-slate-800">{t("teacherSpaceLabel")}</span>
              <button type="button" className="p-2 rounded-lg hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3">
              {DESKTOP_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block px-4 py-3 text-sm font-semibold border-l-4",
                    isTeacherNavActive(pathname, item.href)
                      ? "bg-slate-50 text-[#00694c] border-[#00694c]"
                      : "text-slate-700 border-transparent",
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  {t(item.labelKey)}
                  {item.href === "/messages" && unreadMessages > 0 ? (
                    <span className="ml-2 text-xs text-red-600">({unreadMessages})</span>
                  ) : null}
                </Link>
              ))}
              <div className="my-3 border-t border-slate-100" />
              <Link
                href="/teacher/my-profile"
                className="block px-4 py-3 text-sm font-semibold text-slate-800"
                onClick={() => setMenuOpen(false)}
              >
                {t("teacherNavMyProfile")}
              </Link>
              <Link
                href="/teacher/settings"
                className="block px-4 py-3 text-sm font-medium text-slate-700"
                onClick={() => setMenuOpen(false)}
              >
                {t("settings")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
