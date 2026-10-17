"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, CreditCard } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/locale-context";
import { TEACHER_SETUP_STEPS, teacherSetupHref, type TeacherSetupStep } from "@/lib/teachers/guidedSetup";

export function TeacherSetupNavigation({ step, beforeNavigate }: { step: TeacherSetupStep; beforeNavigate?: () => Promise<boolean> }) {
  const { user } = useAuth();
  const { t } = useLocale();
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  useEffect(() => {
    const unavailable = () => setStorageUnavailable(true);
    window.addEventListener("teacher-setup-storage-unavailable", unavailable);
    return () => window.removeEventListener("teacher-setup-storage-unavailable", unavailable);
  }, []);
  useEffect(() => {
    if (!user?.id) return;
    try { localStorage.setItem(`pratiqo:teacher-setup:${user.id}`, step); } catch { /* Navigation remains usable without storage. */ }
  }, [step, user?.id]);
  const labels = { course: t("teacherGuidedCourse"), availability: t("teacherGuidedAvailability"), payments: t("teacherGuidedPayments") };
  const icons = { course: BookOpen, availability: CalendarDays, payments: CreditCard };
  return <><nav aria-label={t("teacherGuidedTitle")} className="grid min-w-0 grid-cols-3 gap-2" data-testid="teacher-guided-navigation">
    {TEACHER_SETUP_STEPS.map((item, index) => {
      const Icon = icons[item];
      return <Link key={item} href={teacherSetupHref(item)} aria-current={item === step ? "step" : undefined}
        onClick={beforeNavigate ? async event => {
          event.preventDefault();
          if (await beforeNavigate()) window.location.assign(teacherSetupHref(item));
        } : undefined}
        className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center text-xs font-semibold sm:flex-row sm:text-sm ${item === step ? "border-teal-700 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-600"}`}>
        <Icon size={18} aria-hidden /><span className="max-w-full break-words">{index + 1}. {labels[item]}</span>
      </Link>;
    })}
  </nav>{storageUnavailable && <p role="alert" className="text-sm text-amber-800">{t("teacherGuidedStorageUnavailable")}</p>}</>;
}
