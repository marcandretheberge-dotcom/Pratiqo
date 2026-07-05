"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, ChevronRight, CreditCard, GraduationCap, Loader2, MapPin, Sparkles, TrendingUp } from "lucide-react";
import { useAuth } from "../../../components/AuthProvider";
import { logout } from "@/lib/auth";
import { getSupabaseClient } from "../../../lib/supabase";
import { authDisplayName } from "../../../lib/authDisplay";
import { useLocale } from "../../../lib/locale-context";
import type { CompanionType } from "../../../lib/companions";
import { LocaleSwitcher } from "../../../components/LocaleSwitcher";
import { AccountDeletionSection } from "../../../components/account/AccountDeletionSection";
import { CompanionCard } from "../../../components/companion/CompanionCard";
import { AvatarUpload } from "../../../components/profile/AvatarUpload";
import { cn } from "../../../lib/utils";
import type { TranslationKey } from "../../../lib/translations";
import { COMPLETED_LESSON_FOR_COMPANION_FILTER } from "../../../lib/companion/rewards";

const LEARNING_FORMAT_VALUES = ["no_preference", "at_home", "in_person", "online", "hybrid"] as const;

type LearningFormatPref = (typeof LEARNING_FORMAT_VALUES)[number];

const FORMAT_LABEL_KEYS: Record<LearningFormatPref, TranslationKey> = {
  no_preference: "formatNoPreference",
  at_home: "formatAtHome",
  in_person: "formatInPerson",
  online: "formatOnline",
  hybrid: "formatHybrid",
};

function coerceLearningFormatPref(v: string | null | undefined): LearningFormatPref {
  const x = String(v ?? "").trim();
  if (x === "at_home" || x === "in_person" || x === "online" || x === "hybrid" || x === "no_preference") return x;
  return "no_preference";
}

export default function StudentProfilePage() {
  const { user, profile } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const userId = user?.id;
  const userCreatedAt = user?.created_at ?? null;
  const [loading, setLoading] = useState(true);
  const [completedLessonCount, setCompletedLessonCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [companionType, setCompanionType] = useState<CompanionType | null>(null);
  const [companionChosen, setCompanionChosen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [memberYear, setMemberYear] = useState<number | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locCity, setLocCity] = useState("");
  const [locRegion, setLocRegion] = useState("");
  const [locCountry, setLocCountry] = useState("");
  const [locFormat, setLocFormat] = useState<LearningFormatPref>("no_preference");
  const [locSaving, setLocSaving] = useState(false);
  const [locMsg, setLocMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === "teacher") {
      router.replace("/dashboard");
    }
  }, [profile?.role, router]);

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const [{ data: prof }, { data: bRows }, { count: completedLessons }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "photo_url, companion_type, companion_chosen, created_at, dashboard, city, region, country_code, preferred_learning_format",
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("bookings").select("teacher_id, status").eq("student_id", userId),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("student_id", userId)
          .or(COMPLETED_LESSON_FOR_COMPANION_FILTER),
      ]);

      if (cancelled) return;

      const p = prof as
        | {
            companion_type?: string | null;
            companion_chosen?: boolean | null;
            photo_url?: string | null;
            created_at?: string | null;
            dashboard?: unknown;
            city?: string | null;
            region?: string | null;
            country_code?: string | null;
            preferred_learning_format?: string | null;
          }
        | null;
      const ctype = p?.companion_type;
      setCompanionType(ctype === "phoenix" || ctype === "forest" || ctype === "dragon" || ctype === "star" ? (ctype as CompanionType) : null);
      setCompanionChosen(Boolean(p?.companion_chosen));
      const loadedPhotoUrl = typeof p?.photo_url === "string" && p.photo_url.trim() ? p.photo_url.trim() : null;
      setPhotoUrl(loadedPhotoUrl);
      const createdAt = p?.created_at || userCreatedAt || null;
      setMemberYear(createdAt ? new Date(String(createdAt)).getFullYear() : null);

      const dash = p?.dashboard && typeof p.dashboard === "object" ? (p.dashboard as Record<string, unknown>) : {};
      setNotificationsEnabled(dash.notificationsEnabled !== false);

      setLocCity(String(p?.city ?? "").trim());
      setLocRegion(String(p?.region ?? "").trim());
      setLocCountry(String(p?.country_code ?? "").trim().toUpperCase().slice(0, 2));
      setLocFormat(coerceLearningFormatPref(p?.preferred_learning_format ?? undefined));

      const bookings = (bRows || []) as unknown as { teacher_id: string; status: string }[];
      const distinctTeacherIds = new Set<string>();
      for (const r of bookings) {
        if (r.teacher_id) distinctTeacherIds.add(r.teacher_id);
      }
      setTeacherCount(distinctTeacherIds.size);
      setCompletedLessonCount(typeof completedLessons === "number" ? completedLessons : 0);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userCreatedAt, userId]);

  if (!user) return null;

  return (
    <div className="space-y-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:pb-10">
      {/* HEADER */}
      <section className="text-center space-y-2">
        <AvatarUpload userId={user.id} displayName={authDisplayName(user)} currentPhotoUrl={photoUrl} onPhotoUrlChange={setPhotoUrl} />
        <p className="text-[16px] font-bold text-slate-900">{authDisplayName(user)}</p>
        <p className="text-[12px] text-slate-600">
          {t("student")} · {t("profileMemberSince")} {memberYear ?? "—"}
        </p>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-3 gap-2">
        <StatCard label={t("profileLessons")} value={loading ? "…" : String(completedLessonCount)} />
        <StatCard label={t("profileTeachers")} value={loading ? "…" : String(teacherCount)} />
        <CreditsStatLink label={t("profileCredits")} cta={t("profileViewCredits")} />
      </section>

      {/* COMPANION */}
      <section className="space-y-3">
        <div
          className="rounded-3xl p-4 text-white shadow-[0_18px_60px_rgba(15,110,86,0.20)]"
          style={{ background: "linear-gradient(135deg, var(--palette-teal-700), var(--palette-teal-500))" }}
        >
          <CompanionCard
            companionType={companionType}
            companionChosen={companionChosen}
            lessonCount={completedLessonCount}
            loading={loading}
            variant="profile"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href="/student/progress"
            className="inline-flex min-h-11 items-center justify-between gap-2 rounded-2xl border border-[#DCEAE3] bg-white px-4 py-3 text-sm font-semibold text-[#0F6E56] shadow-sm transition hover:border-[#1D9E75]/40 hover:bg-[#F3FAF6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
          >
            <span className="inline-flex items-center gap-2">
              <TrendingUp size={16} aria-hidden />
              {t("profileViewMyProgress")}
            </span>
            <ArrowRight size={16} aria-hidden />
          </Link>
          <Link
            href="/student/choose-companion"
            className="inline-flex min-h-11 items-center justify-between gap-2 rounded-2xl border border-[#DCEAE3] bg-white px-4 py-3 text-sm font-semibold text-[#0F6E56] shadow-sm transition hover:border-[#1D9E75]/40 hover:bg-[#F3FAF6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles size={16} aria-hidden />
              {t("profileChangeCompanion")}
            </span>
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      {/* SETTINGS */}
      <section className="space-y-3 rounded-[1.75rem] border border-[var(--p-border-light)] bg-white p-4 shadow-sm sm:rounded-3xl">
        <Row label={t("profileLanguage")}>
          <div className="shrink-0 max-w-[200px] sm:max-w-none sm:scale-95 sm:origin-right">
            <LocaleSwitcher variant="light" compact />
          </div>
        </Row>

        <Row label={t("profileNotifications")}>
          <button
            type="button"
            onClick={async () => {
              const next = !notificationsEnabled;
              setNotificationsEnabled(next);
              const supabase = getSupabaseClient();
              const { data: prof } = await supabase.from("profiles").select("dashboard").eq("id", user.id).maybeSingle();
              const profileDashboard = (prof as { dashboard?: unknown } | null)?.dashboard;
              const dash =
                profileDashboard && typeof profileDashboard === "object" && !Array.isArray(profileDashboard)
                  ? (profileDashboard as Record<string, unknown>)
                  : {};
              await supabase.from("profiles").update({ dashboard: { ...dash, notificationsEnabled: next } }).eq("id", user.id);
            }}
            className={cn(
              "h-8 w-14 rounded-full border transition-colors relative",
              notificationsEnabled ? "bg-teal-600 border-teal-500" : "bg-slate-100 border-[var(--p-border-light)]",
            )}
            aria-label={t("profileNotifications")}
          >
            <span
              className={cn(
                "absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all",
                notificationsEnabled ? "left-7" : "left-1",
              )}
            />
          </button>
        </Row>

        <Row label="SMS">
          <span className="rounded-full border border-[#DCEAE3] bg-[#F3FAF6] px-3 py-1 text-xs font-bold text-teal-700">
            {t("smsRemindersComingLater")}
          </span>
        </Row>

        <div className="space-y-3 border-t border-[var(--p-border-light)] pt-4">
          <div className="flex items-center gap-3 px-3 pb-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <MapPin size={18} />
            </span>
            <p className="text-sm font-bold text-slate-900">{t("studentFindTeacher")}</p>
          </div>
          <label className="block px-3">
            <span className="text-[13px] font-semibold text-slate-700">{t("studentCity")}</span>
            <input
              value={locCity}
              onChange={(e) => setLocCity(e.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--p-border-light)] bg-[#fafaf8] px-3 text-sm outline-none focus:border-teal-500"
              autoComplete="address-level2"
            />
          </label>
          <label className="block px-3">
            <span className="text-[13px] font-semibold text-slate-700">{t("studentRegion")}</span>
            <input
              value={locRegion}
              onChange={(e) => setLocRegion(e.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--p-border-light)] bg-[#fafaf8] px-3 text-sm outline-none focus:border-teal-500"
              autoComplete="address-level1"
            />
          </label>
          <label className="block px-3">
            <span className="text-[13px] font-semibold text-slate-700">{t("studentCountry")}</span>
            <input
              value={locCountry}
              maxLength={2}
              placeholder="CA"
              onChange={(e) => setLocCountry(e.target.value.toUpperCase())}
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--p-border-light)] bg-[#fafaf8] px-3 text-sm uppercase outline-none tracking-widest focus:border-teal-500"
              autoComplete="country"
              inputMode="text"
              aria-label={t("studentCountry")}
            />
          </label>
          <label className="block px-3">
            <span className="text-[13px] font-semibold text-slate-700">{t("studentPreferredFormat")}</span>
            <select
              value={locFormat}
              onChange={(e) => setLocFormat(coerceLearningFormatPref(e.target.value))}
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--p-border-light)] bg-[#fafaf8] px-3 text-sm outline-none focus:border-teal-500"
            >
              {LEARNING_FORMAT_VALUES.map((fk) => (
                <option key={fk} value={fk}>
                  {t(FORMAT_LABEL_KEYS[fk])}
                </option>
              ))}
            </select>
          </label>
          <div className="px-3 pb-1">
            <button
              type="button"
              disabled={locSaving}
              onClick={async () => {
                setLocSaving(true);
                setLocMsg(null);
                try {
                  const supabase = getSupabaseClient();
                  const cc = locCountry.trim().toUpperCase().slice(0, 2);
                  const { error: upErr } = await supabase
                    .from("profiles")
                    .update({
                      city: locCity.trim() || null,
                      region: locRegion.trim() || null,
                      country_code: cc || "CA",
                      preferred_learning_format: locFormat,
                    })
                    .eq("id", user.id);
                  if (upErr) {
                    setLocMsg(t("errorGeneric"));
                  } else {
                    setLocMsg(t("savedOk"));
                  }
                } catch {
                  setLocMsg(t("errorGeneric"));
                } finally {
                  setLocSaving(false);
                  window.setTimeout(() => setLocMsg(null), 4000);
                }
              }}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 text-sm font-bold text-white disabled:opacity-60 sm:w-auto"
            >
              {locSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("save")}
            </button>
            {locMsg ? <p className="mt-2 text-xs text-slate-600">{locMsg}</p> : null}
          </div>
        </div>

        <Link
          href="/student/payments"
          className="flex min-h-[56px] items-center justify-between rounded-2xl px-3 py-3 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <CreditCard size={18} />
            </span>
            <span className="text-sm font-semibold text-slate-800">{t("profilePayments")}</span>
          </div>
          <ChevronRight size={18} className="text-slate-600" />
        </Link>

        <Link
          href="/student/learners"
          className="flex min-h-[56px] items-center justify-between rounded-2xl px-3 py-3 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <GraduationCap size={18} />
            </span>
            <span className="text-sm font-semibold text-slate-800">{t("learnerProfilesTitle")}</span>
          </div>
          <ChevronRight size={18} className="text-slate-600" />
        </Link>

        <AccountDeletionSection />

        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-[48px] w-full rounded-2xl px-3 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"
        >
          {t("profileSignOut")}
        </button>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[76px] rounded-2xl border border-[var(--p-border-light)] bg-white p-3 text-center shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
      <p className="mt-1 text-[18px] font-bold text-teal-700">{value}</p>
    </div>
  );
}

function CreditsStatLink({ label, cta }: { label: string; cta: string }) {
  return (
    <Link
      href="/student/progress"
      className="flex min-h-[76px] flex-col items-center justify-center rounded-2xl border border-[var(--p-border-light)] bg-white p-3 text-center shadow-sm transition hover:border-[#1D9E75]/40 hover:bg-[#F3FAF6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-[14px] font-bold text-teal-700">
        {cta}
        <ArrowRight size={14} aria-hidden />
      </p>
    </Link>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl px-3 py-2.5 hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <span className="h-9 w-9 rounded-xl bg-[#F1EFE8] text-[#2C2C2A] flex items-center justify-center">
          <Bell size={18} />
        </span>
        <span className="text-sm font-semibold text-slate-800">{label}</span>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
