"use client";

/**
 * TeacherRecruitStrip
 *
 * A thin, dismissible banner that sits at the very bottom of every page,
 * inviting teachers who land on a student-facing page to create an account.
 *
 * — Locale-aware: FR / EN / ES copy adapts to the detected user language.
 * — Dismissible: hidden in localStorage once the user closes it.
 * — Non-intrusive: 40 px tall, semi-transparent, only visible on scroll-end.
 * — Suppressed on /devenir-enseignant and /become-teacher pages (already there).
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/locale-context";

const STORAGE_KEY = "pratiqo-teacher-strip-dismissed";

// Pages where this strip should not appear (teacher is already the audience).
const SUPPRESSED_PATHS = ["/devenir-enseignant", "/become-teacher", "/onboarding", "/login"];

export function TeacherRecruitStrip() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // localStorage unavailable — show the strip
    }
    setVisible(true);
  }, []);

  const suppressed =
    SUPPRESSED_PATHS.some((p) => pathname?.startsWith(p)) ||
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/teacher") ||
    pathname?.startsWith("/student") ||
    pathname?.startsWith("/booking") ||
    pathname?.startsWith("/messages") ||
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/profile") ||
    pathname?.startsWith("/loyalty") ||
    pathname?.startsWith("/upgrade") ||
    pathname?.startsWith("/group-sessions");

  if (!visible || suppressed) return null;

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      role="banner"
      aria-label={t("bannerAreYouTeacher")}
      className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-between gap-3 bg-[#0F6E56] px-4 sm:px-6 h-11 shadow-lg"
    >
      <span className="text-xs text-white/85 font-medium truncate">{t("bannerAreYouTeacher")}</span>

      <Link
        href="/devenir-enseignant"
        className="shrink-0 text-xs font-bold text-white underline underline-offset-2 hover:text-white/85 transition-colors"
      >
        {t("bannerJoinCta")}
      </Link>

      <button
        type="button"
        onClick={dismiss}
        aria-label={t("bannerDismiss")}
        className="shrink-0 rounded-md p-1 text-white/60 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
