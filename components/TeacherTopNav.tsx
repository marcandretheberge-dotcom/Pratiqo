"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, MessageCircle, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import PratiqoLogo from "@/components/PratiqoLogo";
import { NotificationCenter } from "@/components/NotificationCenter";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useLocale } from "@/lib/locale-context";
import { useAuth } from "@/components/AuthProvider";
import { authDisplayName } from "@/lib/authDisplay";
import { logout } from "@/lib/auth";
import { buildTeacherMobileDrawerNav, isTeacherNavActive } from "@/components/teacher/teacherNavConfig";

function initialsFrom(name: string | undefined, email: string | undefined): string {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase() || "?";
  return base.slice(0, 2).toUpperCase() || "?";
}

/**
 * Teacher global header: logo, messages, locale, notifications, avatar.
 * Section routes live in TeacherSidebarNav (desktop) and the mobile drawer here.
 * No horizontal desktop tab strip — that caused page-level overflow.
 */
export function TeacherTopNav({ unreadMessages }: { unreadMessages: number }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { user, profile } = useAuth();
  const displayName = (profile?.name as string | undefined) || (user ? authDisplayName(user) : "");
  const photoUrl = (profile?.photo_url as string | null | undefined) ?? null;
  const initials = initialsFrom(displayName, user?.email || undefined);
  const drawerNav = buildTeacherMobileDrawerNav();

  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!avatarOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!avatarRef.current?.contains(target)) setAvatarOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [avatarOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setAvatarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full shrink-0 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80"
        style={{ borderBottom: "0.5px solid #D3D1C7" }}
        data-testid="teacher-top-header"
      >
        <div className="flex h-[52px] w-full items-center justify-between gap-3 px-4 sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3 md:min-w-0">
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label={t("teacherTopNavMenu")}
              aria-expanded={menuOpen}
              aria-controls="teacher-mobile-nav-drawer"
              data-testid="teacher-mobile-nav-trigger"
            >
              <Menu size={22} />
            </button>
            {/* Logo on mobile only — desktop logo lives in the sidebar. */}
            <Link href="/dashboard" className="shrink-0 md:hidden" aria-label={t("ariaHome")}>
              <PratiqoLogo variant="icon" size="sm" />
            </Link>
            <p className="hidden truncate text-sm font-semibold text-slate-600 md:block" data-testid="teacher-top-shell-label">
              {t("teacherSpaceLabel")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/messages"
              className={cn(
                "relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600",
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
                className="flex items-center gap-1 rounded-full border border-slate-200/90 py-1 pl-1 pr-2 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
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
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[65] md:hidden" data-testid="teacher-mobile-nav-drawer-root">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("bannerDismiss")}
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="teacher-mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t("teacherSpaceLabel")}
            className="absolute bottom-0 left-0 top-0 flex w-[min(100%,320px)] flex-col bg-white shadow-xl"
            data-testid="teacher-mobile-nav-drawer"
          >
            <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
              <span className="text-sm font-bold text-slate-800">{t("teacherSpaceLabel")}</span>
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                onClick={() => setMenuOpen(false)}
                aria-label={t("bannerDismiss")}
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3" aria-label={t("teacherSpaceLabel")}>
              {drawerNav.map((item) => {
                const Icon = item.icon;
                const active = isTeacherNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 border-l-4 px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-600",
                      active
                        ? "border-[#00694c] bg-slate-50 text-[#00694c]"
                        : "border-transparent text-slate-700",
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon size={17} className="shrink-0 opacity-80" aria-hidden />
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
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
