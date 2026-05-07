"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Info, Loader2, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { logout } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import { localeToBcp47 } from "@/lib/i18n/types";
import { disciplineLabelToTeacherCategory, getDisciplineById, getEnabledDisciplines } from "@/lib/disciplines";
import type { TeacherRow } from "@/lib/teacherMapper";
import { isValidVideoUrl } from "@/lib/videoEmbed";
import { TeacherPayoutPreview } from "@/components/teacher/TeacherPayoutPreview";

type TeacherDisciplineDbRow = {
  id: string;
  discipline_id: string;
  specialite: string | null;
  sort_order: number;
};

type NotifPrefs = {
  newBooking: boolean;
  reminder1h: boolean;
  studentMessages: boolean;
  promotions: boolean;
};

const defaultNotif: NotifPrefs = {
  newBooking: true,
  reminder1h: true,
  studentMessages: true,
  promotions: false,
};

async function syncTeacherPrimaryFromDisciplines(
  supabase: ReturnType<typeof getSupabaseClient>,
  teacherId: string,
): Promise<void> {
  const { data: rows } = await supabase
    .from("teacher_disciplines")
    .select("discipline_id, specialite, sort_order")
    .eq("teacher_id", teacherId)
    .order("sort_order", { ascending: true });
  if (!rows?.length) return;
  const first = rows[0] as { discipline_id: string; specialite: string | null };
  const meta = getDisciplineById(first.discipline_id);
  const label = meta?.label ?? "Musique";
  const category = disciplineLabelToTeacherCategory(label);
  const discipline = String(first.specialite || "").trim() || "—";
  await supabase.from("teachers").update({ discipline, category }).eq("id", teacherId);
}

function readNotifPrefs(dash: Record<string, unknown> | null): NotifPrefs {
  if (!dash || typeof dash !== "object") return { ...defaultNotif };
  const raw = dash.teacherNotifications as Partial<NotifPrefs> | undefined;
  if (!raw || typeof raw !== "object") return { ...defaultNotif };
  return {
    newBooking: raw.newBooking !== false,
    reminder1h: raw.reminder1h !== false,
    studentMessages: raw.studentMessages !== false,
    promotions: raw.promotions === true,
  };
}

function encodeTeachingMode(p: boolean, o: boolean, h: boolean): string {
  const n = (p ? 1 : 0) + (o ? 1 : 0) + (h ? 1 : 0);
  if (n === 0) return "both";
  if (n === 3) return "all";
  if (p && o && !h) return "both";
  if (p && !o && !h) return "person";
  if (!p && o && !h) return "online";
  if (!p && !o && h) return "home";
  return "all";
}

export function TeacherAccountView({ variant }: { variant: "profile" | "system" }) {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [hourly, setHourly] = useState("");
  const [city, setCity] = useState("");
  const [locationJson, setLocationJson] = useState<Record<string, unknown>>({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [teachingMode, setTeachingMode] = useState("both");
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [plan, setPlan] = useState("free");
  const [loyaltyTier, setLoyaltyTier] = useState<string | null>(null);
  const [annualVolumeCents, setAnnualVolumeCents] = useState(0);
  const [notif, setNotif] = useState<NotifPrefs>(defaultNotif);
  const [dashboardJson, setDashboardJson] = useState<Record<string, unknown>>({});

  const [discRows, setDiscRows] = useState<TeacherDisciplineDbRow[]>([]);
  const [discLoading, setDiscLoading] = useState(true);
  const [showAddDisc, setShowAddDisc] = useState(false);
  const [addDiscId, setAddDiscId] = useState("");
  const [addSpec, setAddSpec] = useState("");
  const [discSaving, setDiscSaving] = useState(false);
  const [taxAckDate, setTaxAckDate] = useState<string | null>(null);
  const [taxAcknowledged, setTaxAcknowledged] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoUrlError, setVideoUrlError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseClient();
    const load = async () => {
      if (!user) {
        if (!cancelled) {
          setDiscLoading(false);
          setLoading(false);
        }
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("email, name, photo_url, plan, loyalty_tier, loyalty_annual_volume, dashboard, tax_status_acknowledged, tax_status_acknowledged_at")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setEmail(String((prof as { email?: string })?.email || user.email || ""));
      setDisplayName(String((prof as { name?: string })?.name || ""));
      setPhotoUrl(((prof as { photo_url?: string | null })?.photo_url as string | null) ?? null);
      setPlan(String((prof as { plan?: string | null })?.plan || "free"));
      setLoyaltyTier((prof as { loyalty_tier?: string | null } | null)?.loyalty_tier ?? null);
      setAnnualVolumeCents(Math.round(Math.max(0, Number((prof as { loyalty_annual_volume?: number | string | null } | null)?.loyalty_annual_volume ?? 0)) * 100));
      const dash = (prof as { dashboard?: unknown })?.dashboard;
      const d = typeof dash === "object" && dash !== null ? (dash as Record<string, unknown>) : {};
      setDashboardJson(d);
      setNotif(readNotifPrefs(d));
      setTaxAcknowledged(Boolean((prof as { tax_status_acknowledged?: boolean })?.tax_status_acknowledged));
      const taxDate = (prof as { tax_status_acknowledged_at?: string | null })?.tax_status_acknowledged_at;
      setTaxAckDate(taxDate ?? null);

      const { data, error } = await supabase.from("teachers").select("*").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setTeacherId(null);
        setDiscLoading(false);
        setLoading(false);
        return;
      }
      const row = data as TeacherRow & { stripe_account_id?: string | null; video_url?: string | null };
      setTeacherId(row.id);
      setBio(row.bio || "");
      setHourly(String(row.price_per_lesson ?? ""));
      setTeachingMode(row.teaching_mode || "both");
      setStripeAccountId(row.stripe_account_id?.trim() || null);
      setVideoUrl(row.video_url ?? "");
      const loc = (row.location || {}) as Record<string, unknown>;
      setLocationJson(loc);
      setCity(typeof loc.neighborhood === "string" ? loc.neighborhood : "");

      const enabledList = getEnabledDisciplines();
      setAddDiscId(enabledList[0]?.id ?? "musique");
      const { data: drows, error: dErr } = await supabase
        .from("teacher_disciplines")
        .select("id, discipline_id, specialite, sort_order")
        .eq("teacher_id", row.id)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (!dErr && drows) setDiscRows(drows as TeacherDisciplineDbRow[]);
      else setDiscRows([]);
      setDiscLoading(false);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const reloadDisciplines = async (tid: string) => {
    const supabase = getSupabaseClient();
    const { data: drows } = await supabase
      .from("teacher_disciplines")
      .select("id, discipline_id, specialite, sort_order")
      .eq("teacher_id", tid)
      .order("sort_order", { ascending: true });
    setDiscRows((drows as TeacherDisciplineDbRow[]) ?? []);
  };

  const removeDiscipline = async (rowId: string) => {
    if (!teacherId || discRows.length <= 1) return;
    setDiscSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("teacher_disciplines").delete().eq("id", rowId);
    if (error) {
      setMessage(error.message);
      setDiscSaving(false);
      return;
    }
    await syncTeacherPrimaryFromDisciplines(supabase, teacherId);
    await reloadDisciplines(teacherId);
    setDiscSaving(false);
    setMessage(t("savedOk"));
  };

  const addDiscipline = async () => {
    if (!teacherId || discRows.length >= 3) return;
    const spec = addSpec.trim();
    if (!spec) {
      setMessage(t("specialtyRequired"));
      return;
    }
    if (discRows.some((r) => r.discipline_id === addDiscId)) {
      setMessage(t("disciplineDuplicate"));
      return;
    }
    setDiscSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const nextOrder = discRows.length ? Math.max(...discRows.map((r) => r.sort_order)) + 1 : 0;
    const { error } = await supabase.from("teacher_disciplines").insert({
      teacher_id: teacherId,
      discipline_id: addDiscId,
      specialite: spec,
      sort_order: nextOrder,
    });
    if (error) {
      setMessage(error.message);
      setDiscSaving(false);
      return;
    }
    await syncTeacherPrimaryFromDisciplines(supabase, teacherId);
    await reloadDisciplines(teacherId);
    setAddSpec("");
    setShowAddDisc(false);
    setDiscSaving(false);
    setMessage(t("savedOk"));
  };

  const saveProfile = async () => {
    if (!user || !teacherId) return;

    // Validate video URL if provided
    const trimmedVideo = videoUrl.trim();
    if (trimmedVideo && !isValidVideoUrl(trimmedVideo)) {
      setVideoUrlError(t("invalidVideoUrl"));
      return;
    }
    setVideoUrlError(null);

    setSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const nextLocation: Record<string, unknown> = { ...locationJson };
    if (city.trim()) nextLocation.neighborhood = city.trim();
    else delete nextLocation.neighborhood;
    const { error: e1 } = await supabase
      .from("teachers")
      .update({
        name: displayName.trim() || undefined,
        bio: bio.trim(),
        price_per_lesson: Number(hourly) || 0,
        location: nextLocation,
        video_url: trimmedVideo || null,
      })
      .eq("id", teacherId);
    const { error: e2 } = await supabase
      .from("profiles")
      .update({ name: displayName.trim() || null, photo_url: photoUrl })
      .eq("id", user.id);
    setSaving(false);
    if (e1 || e2) {
      setMessage(e1?.message || e2?.message || t("anErrorOccurred"));
      return;
    }
    setLocationJson(nextLocation);
    setMessage(t("savedOk"));
  };

  const saveTeachingModeOnly = async () => {
    if (!user || !teacherId) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("teachers").update({ teaching_mode: teachingMode }).eq("id", teacherId);
    setSaving(false);
    if (error) setMessage(error.message);
    else setMessage(t("savedOk"));
  };

  const saveNotifications = async () => {
    if (!user) return;
    setSaving(true);
    const nextDash = { ...dashboardJson, teacherNotifications: notif };
    const { error } = await getSupabaseClient().from("profiles").update({ dashboard: nextDash }).eq("id", user.id);
    setSaving(false);
    if (error) setMessage(error.message);
    else {
      setDashboardJson(nextDash as Record<string, unknown>);
      setMessage(t("savedOk"));
    }
  };

  const openStripeDashboard = async () => {
    const supabase = getSupabaseClient();
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) {
      setMessage(t("sessionExpiredShort"));
      return;
    }
    const res = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !body.url) {
      setMessage(body.error || t("stripeOpenError"));
      return;
    }
    window.location.href = body.url;
  };

  const chipsPerson = teachingMode === "person" || teachingMode === "both" || teachingMode === "all";
  const chipsOnline = teachingMode === "online" || teachingMode === "both" || teachingMode === "all";
  const chipsHome = teachingMode === "home" || teachingMode === "all";
  const toggleFormat = (key: "person" | "online" | "home") => {
    const p = key === "person" ? !chipsPerson : chipsPerson;
    const o = key === "online" ? !chipsOnline : chipsOnline;
    const h = key === "home" ? !chipsHome : chipsHome;
    setTeachingMode(encodeTeachingMode(p, o, h));
  };

  const initials = (displayName || email || "?").slice(0, 2).toUpperCase();

  if (!user) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-8 text-center">
        <p className="text-sm text-slate-600">{t("loginForSettings")}</p>
        <Link href="/" className="mt-4 inline-block text-[#00694c] font-medium underline">
          {t("teacherHome")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#00694c]" size={32} />
      </div>
    );
  }

  if (!teacherId) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-amber-200 rounded-3xl p-8">
        <p className="text-sm font-semibold text-slate-800">{t("noTeacherAccountTitle")}</p>
        <p className="mt-2 text-sm text-slate-600">{t("noTeacherAccountBody")}</p>
      </div>
    );
  }

  const addableDisciplines = getEnabledDisciplines().filter((d) => !discRows.some((r) => r.discipline_id === d.id));

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-16">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#00694c]">
          {variant === "profile" ? t("teacherSpaceLabel") : t("settingsTeacherLabel")}
        </p>
        <h1 className="text-2xl font-bold text-[#2C2C2A]">{variant === "profile" ? t("teacherNavMyProfile") : t("settingsTitle")}</h1>
        {variant === "profile" ? (
          <p className="text-sm text-slate-600 mt-2">{t("teacherMyProfileLead")}</p>
        ) : (
          <p className="text-sm text-slate-600 mt-2">{t("teacherSettingsSystemLead")}</p>
        )}
      </div>

      {variant === "profile" ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#2C2C2A]">{t("sectionProfile")}</h2>
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer shrink-0">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = () => setPhotoUrl(typeof r.result === "string" ? r.result : photoUrl);
                r.readAsDataURL(f);
              }}
            />
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-[#00694c]/30" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-[#1D9E75] text-white flex items-center justify-center text-lg font-bold border-2 border-white shadow">
                {initials}
              </div>
            )}
            <span className="block text-center text-[10px] text-slate-600 mt-1">{t("profilePhotoEdit")}</span>
          </label>
          <p className="text-xs text-slate-600">{t("profilePhotoHint")}</p>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-600 uppercase">{t("profileDisplayName")}</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-600 uppercase">{t("profileHourlyRate")}</span>
          <input
            value={hourly}
            onChange={(e) => setHourly(e.target.value)}
            type="number"
            min={0}
            step="0.5"
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm text-[#00694c] font-semibold"
          />
          <TeacherPayoutPreview
            grossAmount={hourly}
            currency="CAD"
            teacherPlan={plan}
            annualVolumeCents={annualVolumeCents}
            loyaltyTier={loyaltyTier}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-600 uppercase">{t("cityLabel")}</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400"
            placeholder={t("cityPlaceholder")}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-600 uppercase">{t("bioLabel")}</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
          />
        </label>

        {/* ── Video URL ──────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase">
              {t("videoPresentationLabel")}
            </span>
            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
              {t("optionalBadge")}
            </span>
          </div>

          {/* Conversion tip */}
          <div className="flex items-start gap-2 rounded-xl border border-[rgba(0,105,76,0.25)] bg-[rgba(0,105,76,0.05)] px-3 py-2.5">
            <Info size={14} className="text-[#00694c] shrink-0 mt-0.5" aria-hidden />
            <p className="text-[11px] text-[#0f6e56] leading-relaxed">
              {t("videoHelperText")}
            </p>
          </div>

          <input
            type="url"
            value={videoUrl}
            onChange={(e) => {
              setVideoUrl(e.target.value);
              setVideoUrlError(null);
            }}
            placeholder="https://www.youtube.com/watch?v=…"
            className={cn(
              "w-full h-11 rounded-xl border px-3 text-sm text-slate-800 placeholder:text-slate-400",
              videoUrlError ? "border-rose-400 focus:outline-none" : "border-slate-200",
            )}
          />
          {videoUrlError ? (
            <p className="text-xs text-rose-600">{videoUrlError}</p>
          ) : videoUrl && isValidVideoUrl(videoUrl) ? (
            <p className="text-xs text-[#00694c] font-medium">{t("videoLinkRecognized")}</p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void saveProfile()}
          className="h-11 px-6 rounded-full bg-[#00694c] hover:bg-[#008560] text-white text-sm font-semibold disabled:opacity-50 shadow-sm hover:shadow transition-all"
        >
          {t("settingsProfileSave")}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#2C2C2A]">{t("sectionDisciplines")}</h2>
        {discLoading ? (
          <Loader2 className="animate-spin text-[#00694c]" size={24} />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {discRows.map((r) => {
                const meta = getDisciplineById(r.discipline_id);
                const label = `${meta?.emoji ?? "✨"} ${meta?.label ?? r.discipline_id}${r.specialite ? ` — ${r.specialite}` : ""}`;
                return (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,105,76,0.35)] bg-[rgba(0,105,76,0.08)] px-3 py-1.5 text-xs font-semibold text-[#0f6d52]"
                  >
                    {label}
                    <button
                      type="button"
                      disabled={discRows.length <= 1 || discSaving}
                      onClick={() => void removeDiscipline(r.id)}
                      className="rounded-full p-0.5 hover:bg-[rgba(0,105,76,0.2)] disabled:opacity-30"
                      aria-label={t("removeAria")}
                    >
                      <X size={14} />
                    </button>
                  </span>
                );
              })}
            </div>
            {discRows.length < 3 ? (
              <div className="space-y-3">
                {!showAddDisc ? (
                  <button
                    type="button"
                    disabled={discSaving || addableDisciplines.length === 0}
                    onClick={() => setShowAddDisc(true)}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-[#00694c]/40 text-[#0f6e56] text-sm font-semibold hover:bg-[#e1f5ee]/50"
                  >
                    {t("addDiscipline")}
                  </button>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <select
                      value={addDiscId}
                      onChange={(e) => setAddDiscId(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white text-slate-800"
                    >
                      {addableDisciplines.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.emoji} {d.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={addSpec}
                      onChange={(e) => setAddSpec(e.target.value)}
                      placeholder={t("specialtyPlaceholder")}
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white text-slate-800 placeholder:text-slate-400"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={discSaving}
                        onClick={() => void addDiscipline()}
                        className="h-10 px-4 rounded-full bg-[#00694c] hover:bg-[#008560] text-white text-sm font-semibold shadow-sm hover:shadow transition-all"
                      >
                        {t("disciplineAdd")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddDisc(false);
                          setAddSpec("");
                        }}
                        className="h-10 px-4 rounded-full border border-slate-200 text-sm text-slate-600"
                      >
                        {t("cancelAction")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            <p className="text-xs text-slate-600">{t("maxDisciplines")}</p>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#2C2C2A]">{t("sectionFormat")}</h2>
        <div className="flex flex-wrap gap-2">
          {(["inPerson", "online", "homeVisit"] as const).map((labelKey, i) => {
            const keys = ["person", "online", "home"] as const;
            const on = keys[i] === "person" ? chipsPerson : keys[i] === "online" ? chipsOnline : chipsHome;
            return (
              <button
                key={labelKey}
                type="button"
                onClick={() => toggleFormat(keys[i])}
                className={cn(
                  "h-10 px-4 rounded-full text-sm font-semibold border",
                  on ? "border-[#00694c] bg-[rgba(0,105,76,0.12)] text-[#0f6e56]" : "border-slate-200 bg-slate-100 text-slate-600",
                )}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveTeachingModeOnly()}
          className="h-10 px-5 rounded-full bg-[#00694c] hover:bg-[#008560] text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {t("settingsFormatSave")}
        </button>
      </section>
        </>
      ) : null}

      {variant === "system" ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#2C2C2A]">{t("sectionNotifications")}</h2>
        {(
          [
            ["newBooking", "notifNewBooking"],
            ["reminder1h", "notifReminder1h"],
            ["studentMessages", "notifStudentMessages"],
            ["promotions", "notifPromotions"],
          ] as const
        ).map(([key, labelKey]) => {
          const on = notif[key];
          return (
            <label key={key} className="flex items-center justify-between gap-4 cursor-pointer py-1">
              <span className="text-sm text-[#2C2C2A]">{t(labelKey)}</span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => setNotif((n) => ({ ...n, [key]: !n[key] }))}
                className={cn(
                  "relative h-7 w-12 rounded-full transition-colors shrink-0",
                  on ? "bg-[#00694c]" : "bg-slate-300",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                    on ? "left-5" : "left-0.5",
                  )}
                />
              </button>
            </label>
          );
        })}
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveNotifications()}
          className="h-10 px-5 rounded-full bg-[#00694c] hover:bg-[#008560] text-white text-sm font-semibold disabled:opacity-50 shadow-sm hover:shadow transition-all"
        >
          {t("settingsNotifSave")}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#2C2C2A]">{t("sectionPayments")}</h2>
        <p className="text-sm text-slate-600">
          {t("stripeConnectLabel")}{" "}
          <span className="font-semibold text-[#2C2C2A]">
            {stripeAccountId ? t("stripeConnected") : t("stripeDisconnected")}
          </span>
        </p>
        <button
          type="button"
          onClick={() => void openStripeDashboard()}
          className="h-10 px-5 rounded-full border-2 border-[#2C2C2A]/15 bg-white text-sm font-semibold text-[#2C2C2A]"
        >
          {t("manageStripe")}
        </button>
        <p className="text-sm text-slate-600">
          {t("currentPlanPrefix")} <span className="font-bold text-[#00694c]">{plan === "pro" ? t("planProLabel") : t("planFreeLabel")}</span>
        </p>
        <Link
          href="/upgrade"
          className="inline-flex h-10 px-5 rounded-full bg-[#00694c] hover:bg-[#008560] text-white text-sm font-semibold items-center shadow-sm hover:shadow transition-all"
        >
          {t("upgradeToPro")}
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-[#2C2C2A]">{t("sectionAccount")}</h2>
        <p className="text-sm text-slate-600">{t("emailLabel")}</p>
        <p className="text-sm font-medium text-[#2C2C2A]">{email}</p>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-sm font-semibold text-red-600 hover:underline"
        >
          {t("signOut")}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-1.5">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">{t("taxSettingsSectionTitle")}</h2>
        {taxAcknowledged ? (
          <>
            <p className="text-sm text-slate-600">{t("taxSettingsStatus")}</p>
            {taxAckDate ? (
              <p className="text-xs text-slate-600">
                {t("taxSettingsDate")}{" "}
                {new Date(taxAckDate).toLocaleDateString(localeToBcp47(locale), {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-slate-600">{t("taxSettingsNotYet")}</p>
        )}
      </section>
        </>
      ) : null}

      {message ? <p className={cn("text-sm text-center", message === t("savedOk") ? "text-[#00694c]" : "text-rose-600")}>{message}</p> : null}
    </div>
  );
}
