"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Shield,
  Star,
  User,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PratiqoLogo from "@/components/PratiqoLogo";
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
  if (href === "/teacher/schedule") return pathname.startsWith("/teacher/schedule") || pathname.startsWith("/teacher/group-sessions");
  if (href === "/teacher/progress") return pathname.startsWith("/teacher/progress");
  if (href === "/teacher/revenue") return pathname.startsWith("/teacher/revenue");
  if (href === "/resolution") return pathname.startsWith("/resolution");
  if (href === "/loyalty") return pathname.startsWith("/loyalty");
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavItem = {
  href: string;
  labelKey:
    | "teacherDashboard"
    | "teacherSchedule"
    | "teacherStudents"
    | "teacherMessages"
    | "teacherLoyalty"
    | "teacherVerification"
    | "teacherNavRevenue"
    | "teacherNavMyProfile"
    | "resolutionCenterTitle"
    | "settings";
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "teacherDashboard", icon: LayoutDashboard },
  { href: "/teacher/schedule", labelKey: "teacherSchedule", icon: Calendar },
  { href: "/teacher/progress", labelKey: "teacherStudents", icon: Users },
  { href: "/teacher/revenue", labelKey: "teacherNavRevenue", icon: CircleDollarSign },
  { href: "/messages", labelKey: "teacherMessages", icon: MessageCircle },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/resolution", labelKey: "resolutionCenterTitle", icon: LifeBuoy },
  { href: "/loyalty", labelKey: "teacherLoyalty", icon: Star },
  { href: "/teacher/verification", labelKey: "teacherVerification", icon: Shield },
];

const DRAWER_EXTRA_NAV: NavItem[] = [
  { href: "/teacher/my-profile", labelKey: "teacherNavMyProfile", icon: User },
  { href: "/teacher/settings", labelKey: "settings", icon: User },
];

function hasActiveItem(pathname: string | null, items: NavItem[]) {
  return items.some((item) => isTeacherNavActive(pathname, item.href));
}

export function TeacherTopNav({ unreadMessages }: { unreadMessages: number }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { user, profile } = useAuth();
  const displayName = (profile?.name as string | undefined) || (user ? authDisplayName(user) : "");
  const photoUrl = (profile?.photo_url as string | null | undefined) ?? null;
  const initials = initialsFrom(displayName, user?.email || undefined);

  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!avatarOpen && !moreOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (avatarOpen && !avatarRef.current?.contains(target)) setAvatarOpen(false);
      if (moreOpen && !moreRef.current?.contains(target)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [avatarOpen, moreOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setAvatarOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  const tabClass = (href: string, extra?: string) =>
    cn(
      "inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition-colors whitespace-nowrap",
      extra,
      isTeacherNavActive(pathname, href)
        ? "border-teal-500 text-teal-700"
        : "border-transparent text-slate-600 hover:border-slate-200 hover:text-teal-700",
    );

  const moreActive = hasActiveItem(pathname, SECONDARY_NAV) || isTeacherNavActive(pathname, "/teacher/settings");

  return (
    <>
      <header
        className="sticky top-0 z-[55] w-full shrink-0 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80"
        style={{ borderBottom: "0.5px solid #D3D1C7" }}
      >
        <div className="mx-auto flex h-[52px] max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 text-slate-700 md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label={t("teacherTopNavMenu")}
            >
              <Menu size={22} />
            </button>
            <Link href="/dashboard" className="shrink-0" aria-label={t("ariaHome")}>
              <PratiqoLogo variant="icon" size="sm" className="md:hidden" />
              <PratiqoLogo variant="full" size="md" className="hidden md:block" />
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/messages"
              className={cn(
                "relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                pathname?.startsWith("/messages")
                  ? "bg-teal-500/20 text-teal-700"
                  : "text-teal-700 hover:bg-teal-500/15",
              )}
              aria-label={t("ariaMessages")}
            >
              <MessageCircle size={21} />
              {unreadMessages > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              ) : null}
            </Link>
            <div className="hidden w-[min(180px,30vw)] shrink-0 sm:block">
              <LocaleSwitcher variant="light" compact />
            </div>
            <NotificationCenter />
            <div className="relative" ref={avatarRef}>
              <button
                type="button"
                onClick={() => setAvatarOpen((open) => !open)}
                className="flex items-center gap-1 rounded-full border border-slate-200/90 py-1 pl-1 pr-2 transition-colors hover:bg-slate-50"
                aria-expanded={avatarOpen}
                aria-haspopup="menu"
              >
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt=""
                    className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white text-[11px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: "var(--palette-teal-500)" }}
                  >
                    {initials}
                  </div>
                )}
                <ChevronDown size={16} className="hidden text-slate-500 sm:block" />
              </button>
              {avatarOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg"
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
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]"
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

        <nav className="mx-auto hidden h-[42px] max-w-[1280px] items-end gap-1 border-t border-[#F1EFE8] px-4 sm:px-5 md:flex lg:px-6" aria-label="Teacher">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={tabClass(item.href)}>
                <Icon size={16} className="shrink-0 opacity-80" aria-hidden />
                {t(item.labelKey)}
                {item.href === "/messages" && unreadMessages > 0 ? (
                  <span className="ml-0.5 inline-flex h-5 min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                ) : null}
              </Link>
            );
          })}

          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={tabClass(item.href, "hidden xl:inline-flex")}>
                <Icon size={16} className="shrink-0 opacity-80" aria-hidden />
                {t(item.labelKey)}
              </Link>
            );
          })}

          <div className="relative xl:hidden" ref={moreRef}>
            <button
              type="button"
              className={cn(
                "inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition-colors",
                moreActive
                  ? "border-teal-500 text-teal-700"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:text-teal-700",
              )}
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              <MoreHorizontal size={17} className="shrink-0" />
              {t("navMore")}
            </button>
            {moreOpen ? (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white py-2 shadow-lg"
                style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.08)" }}
              >
                {[...SECONDARY_NAV, { href: "/teacher/settings", labelKey: "settings", icon: User } as NavItem].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50",
                        isTeacherNavActive(pathname, item.href) ? "text-teal-700" : "text-slate-700",
                      )}
                    >
                      <Icon size={16} className="shrink-0 text-slate-500" />
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </nav>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[65] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("bannerDismiss")}
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute bottom-0 left-0 top-0 flex w-[min(100%,320px)] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
              <span className="text-sm font-bold text-slate-800">{t("teacherSpaceLabel")}</span>
              <button type="button" className="rounded-lg p-2 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3">
              {[...PRIMARY_NAV, ...SECONDARY_NAV, ...DRAWER_EXTRA_NAV].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 border-l-4 px-4 py-3 text-sm font-semibold",
                      isTeacherNavActive(pathname, item.href)
                        ? "border-[#00694c] bg-slate-50 text-[#00694c]"
                        : "border-transparent text-slate-700",
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon size={17} className="shrink-0 opacity-80" />
                    {t(item.labelKey)}
                    {item.href === "/messages" && unreadMessages > 0 ? (
                      <span className="ml-auto text-xs text-red-600">({unreadMessages})</span>
                    ) : null}
                  </Link>
                );
              })}
              <div className="my-3 border-t border-slate-100" />
              <button
                type="button"
                className="flex w-full items-center px-4 py-3 text-left text-sm font-semibold text-[#ba1a1a]"
                onClick={() => void logout()}
              >
                {t("signOut")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
