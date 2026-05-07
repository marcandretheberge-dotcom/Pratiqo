"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, CreditCard, Loader2, MapPin } from "lucide-react";
import { useAuth } from "../../../components/AuthProvider";
import { getSupabaseClient } from "../../../lib/supabase";
import { authDisplayName } from "../../../lib/authDisplay";
import { useLocale } from "../../../lib/locale-context";
import type { CompanionType } from "../../../lib/companions";
import { COMPANIONS, getCompanionStage, getLessonsToNextStage, getProgressPercent } from "../../../lib/companions";
import { LocaleSwitcher } from "../../../components/LocaleSwitcher";
import { CreditsWidget } from "../../../components/CreditsWidget";
import { cn } from "../../../lib/utils";
import type { TranslationKey } from "../../../lib/translations";

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
  const { t, locale } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lessonCount, setLessonCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [points] = useState(0);
  const [companionType, setCompanionType] = useState<CompanionType | null>(null);
  const [myTeachers, setMyTeachers] = useState<{ teacherId: string; name: string; discipline: string | null; imageUrl: string | null }[]>([]);
  const [companionChosen, setCompanionChosen] = useState(false);
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
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const [{ data: prof }, { data: bRows }, { count: confirmedCount }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "companion_type, companion_chosen, created_at, dashboard, city, region, country_code, preferred_learning_format",
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("bookings").select("teacher_id, status").eq("student_id", user.id),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("student_id", user.id).eq("status", "confirmed"),
      ]);

      if (cancelled) return;

      const p = prof as
        | {
            companion_type?: string | null;
            companion_chosen?: boolean | null;
            created_at?: string | null;
            dashboard?: any | null;
            city?: string | null;
            region?: string | null;
            country_code?: string | null;
            preferred_learning_format?: string | null;
          }
        | null;
      const ctype = p?.companion_type;
      setCompanionType(ctype === "phoenix" || ctype === "forest" || ctype === "dragon" || ctype === "star" ? (ctype as CompanionType) : null);
      setCompanionChosen(Boolean(p?.companion_chosen));
      const createdAt = p?.created_at || (user as any)?.created_at || null;
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
      setLessonCount(typeof confirmedCount === "number" ? confirmedCount : 0);

      // Fetch teacher names for review widget
      const teacherList: { teacherId: string; name: string; discipline: string | null; imageUrl: string | null }[] = [];
      await Promise.all(
        Array.from(distinctTeacherIds).map(async (tid) => {
          const { data: tr } = await supabase.from("teachers").select("id, name, discipline, image_url").eq("id", tid).maybeSingle();
          if (tr) {
            const row = tr as { id: string; name: string | null; discipline: string | null; image_url: string | null };
            teacherList.push({
              teacherId: row.id,
              name: row.name ?? tid,
              discipline: row.discipline,
              imageUrl: row.image_url,
            });
          }
        }),
      );
      setMyTeachers(teacherList);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) return null;

  const initials = authDisplayName(user)
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

  const stage = useMemo(() => (companionType ? getCompanionStage(companionType, lessonCount) : null), [companionType, lessonCount]);
  const stageName = useMemo(() => {
    if (!stage) return "";
    if (locale === "en") return stage.nameEn;
    if (locale === "es") return stage.nameEs;
    return stage.name;
  }, [stage, locale]);
  const companionName = useMemo(() => {
    if (!companionType) return "";
    const c = COMPANIONS[companionType];
    if (locale === "en") return c.nameEn;
    if (locale === "es") return c.nameEs;
    return c.name;
  }, [companionType, locale]);
  const percent = useMemo(() => (companionType ? getProgressPercent(companionType, lessonCount) : 0), [companionType, lessonCount]);
  const remaining = useMemo(() => (companionType ? getLessonsToNextStage(companionType, lessonCount) : 0), [companionType, lessonCount]);

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <section className="text-center space-y-2">
        <div className="mx-auto h-16 w-16 rounded-full bg-[#1D9E75] text-white flex items-center justify-center text-lg font-bold">
          {initials || "?"}
        </div>
        <p className="text-[16px] font-bold text-slate-900">{authDisplayName(user)}</p>
        <p className="text-[12px] text-slate-600">
          {t("student")} · {t("profileMemberSince")} {memberYear ?? "—"}
        </p>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-3 gap-2">
        <StatCard label={t("profileLessons")} value={loading ? "…" : String(lessonCount)} />
        <StatCard label={t("profileTeachers")} value={loading ? "…" : String(teacherCount)} />
        <StatCard label={t("profilePoints")} value={String(points)} />
      </section>

      {/* COMPANION */}
      <section
        className="rounded-3xl p-4 text-white shadow-[0_18px_60px_rgba(15,110,86,0.20)]"
        style={{ background: "linear-gradient(135deg, #0F6E56, #1D9E75)" }}
      >
        {companionChosen && companionType && stage ? (
          <div className="flex items-center gap-4">
            <div className="text-[34px] leading-none">{stage.emoji}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{stageName}</p>
              <p className="text-[12px] text-white/80 truncate">{companionName}</p>
              <div className="mt-2 h-1.5 rounded-full bg-white/25 overflow-hidden">
                <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-white/85">
                {remaining > 0 ? `${remaining} ${t("companionMoreLessons")}` : t("companionMaxLevel")}
              </p>
            </div>
            <ChevronRight className="text-white/80" size={18} />
          </div>
        ) : (
          <Link href="/student/choose-companion" className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{t("companionNoCompanion")}</p>
            <ChevronRight className="text-white/80" size={18} />
          </Link>
        )}
      </section>

      {/* MES CRÉDITS */}
      {!loading && (
        <div className="rounded-3xl bg-[#F3FAF6] p-4 sm:p-6">
          <CreditsWidget
            teachers={myTeachers.map((x) => ({
              teacherId: x.teacherId,
              name: x.name,
              discipline: x.discipline,
              imageUrl: x.imageUrl,
            }))}
            lessonCount={lessonCount}
            companionType={companionType}
          />
        </div>
      )}

      {/* SETTINGS */}
      <section className="rounded-3xl border border-[var(--p-border-light)] bg-white p-4 shadow-sm space-y-3">
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
              const dash = prof && typeof (prof as any).dashboard === "object" ? ((prof as any).dashboard as Record<string, unknown>) : {};
              await supabase.from("profiles").update({ dashboard: { ...dash, notificationsEnabled: next } }).eq("id", user.id);
            }}
            className={cn(
              "h-8 w-14 rounded-full border transition-colors relative",
              notificationsEnabled ? "bg-[#1D9E75] border-[#1D9E75]" : "bg-slate-100 border-[var(--p-border-light)]",
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

        <div className="space-y-3 border-t border-[var(--p-border-light)] pt-4">
          <div className="flex items-center gap-3 px-3 pb-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E1F5EE] text-[#0F6E56]">
              <MapPin size={18} />
            </span>
            <p className="text-sm font-bold text-slate-900">{t("studentFindTeacher")}</p>
          </div>
          <label className="block px-3">
            <span className="text-[13px] font-semibold text-slate-700">{t("studentCity")}</span>
            <input
              value={locCity}
              onChange={(e) => setLocCity(e.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--p-border-light)] bg-[#fafaf8] px-3 text-sm outline-none focus:border-[#1D9E75]"
              autoComplete="address-level2"
            />
          </label>
          <label className="block px-3">
            <span className="text-[13px] font-semibold text-slate-700">{t("studentRegion")}</span>
            <input
              value={locRegion}
              onChange={(e) => setLocRegion(e.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--p-border-light)] bg-[#fafaf8] px-3 text-sm outline-none focus:border-[#1D9E75]"
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
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--p-border-light)] bg-[#fafaf8] px-3 text-sm uppercase outline-none tracking-widest focus:border-[#1D9E75]"
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
              className="mt-1 h-11 w-full rounded-2xl border border-[var(--p-border-light)] bg-[#fafaf8] px-3 text-sm outline-none focus:border-[#1D9E75]"
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
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-[#1D9E75] px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {locSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("save")}
            </button>
            {locMsg ? <p className="mt-2 text-xs text-slate-600">{locMsg}</p> : null}
          </div>
        </div>

        <Link
          href="/student/payments"
          className="flex items-center justify-between rounded-2xl px-3 py-3 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center">
              <CreditCard size={18} />
            </span>
            <span className="text-sm font-semibold text-slate-800">{t("profilePayments")}</span>
          </div>
          <ChevronRight size={18} className="text-slate-600" />
        </Link>

        <button
          type="button"
          onClick={async () => {
            const supabase = getSupabaseClient();
            await supabase.auth.signOut();
            router.replace("/");
          }}
          className="w-full rounded-2xl px-3 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"
        >
          {t("profileSignOut")}
        </button>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--p-border-light)] bg-white p-3 shadow-sm text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
      <p className="mt-1 text-[18px] font-bold text-[#1D9E75]">{value}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 hover:bg-slate-50">
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
