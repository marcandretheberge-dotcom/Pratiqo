"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { AccountDeletionSection } from "@/components/account/AccountDeletionSection";
import { TeacherDisciplinesEditor, type DisciplineCardDraft } from "@/components/teacher/TeacherDisciplinesEditor";

type TeacherDisciplineDbRow = {
  id: string;
  discipline_id: string;
  specialite: string | null;
  sort_order: number;
};

type DisciplineCard = {
  disciplineId: string;
  specialties: string[];
  minSort: number;
};

function normalizeSpec(s: string | null | undefined): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

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

const premiumPanelClass = "rounded-2xl border border-[#DCEAE3] bg-white p-6 shadow-[0_18px_54px_rgba(44,44,42,0.07)] space-y-4";

function TeacherAccountSkeleton({ variant }: { variant: "profile" | "system" }) {
  const sectionCount = variant === "profile" ? 3 : 5;

  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 pb-16 sm:px-0" aria-busy="true">
      <div className="space-y-3">
        <div className="h-3 w-32 animate-pulse rounded-full bg-[#BFD8CB]" />
        <div className="h-8 w-64 max-w-full animate-pulse rounded-xl bg-white shadow-[0_10px_30px_rgba(44,44,42,0.05)]" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-[#E8E6DE]" />
      </div>

      {Array.from({ length: sectionCount }).map((_, index) => (
        <section
          key={index}
          className="rounded-2xl border border-[#DCEAE3] bg-white p-6 shadow-[0_18px_54px_rgba(44,44,42,0.07)]"
        >
          <div className="space-y-4">
            <div className="h-5 w-36 animate-pulse rounded-full bg-[#E8E6DE]" />
            <div className="grid gap-3">
              <div className="h-12 animate-pulse rounded-xl border border-[#DCEAE3] bg-[#F3FAF6]" />
              <div className="h-12 animate-pulse rounded-xl border border-[#DCEAE3] bg-[#F3FAF6]" />
            </div>
            <div className="h-10 w-36 animate-pulse rounded-full bg-[#00694c]/15" />
          </div>
        </section>
      ))}
    </div>
  );
}

function DisciplineEditorSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-20 animate-pulse rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6]" />
      <div className="h-20 animate-pulse rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6]" />
      <div className="h-11 animate-pulse rounded-xl border-2 border-dashed border-[#BFD8CB] bg-white" />
    </div>
  );
}

export function TeacherAccountView({ variant }: { variant: "profile" | "system" }) {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherIsPublic, setTeacherIsPublic] = useState(true);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [hourly, setHourly] = useState("");
  const [introEnabled, setIntroEnabled] = useState(false);
  const [introCustomPrice, setIntroCustomPrice] = useState("");
  const [city, setCity] = useState("");
  const [locationJson, setLocationJson] = useState<Record<string, unknown>>({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [teachingMode, setTeachingMode] = useState("both");
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [plan, setPlan] = useState("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [proCurrentPeriodEnd, setProCurrentPeriodEnd] = useState<string | null>(null);
  const [proCancelAtPeriodEnd, setProCancelAtPeriodEnd] = useState(false);
  const [proBusy, setProBusy] = useState(false);
  const [proMessage, setProMessage] = useState<string | null>(null);
  const [loyaltyTier, setLoyaltyTier] = useState<string | null>(null);
  const [annualVolumeCents, setAnnualVolumeCents] = useState(0);
  const [notif, setNotif] = useState<NotifPrefs>(defaultNotif);
  const [dashboardJson, setDashboardJson] = useState<Record<string, unknown>>({});

  const [discRows, setDiscRows] = useState<TeacherDisciplineDbRow[]>([]);
  const [discLoading, setDiscLoading] = useState(true);
  const [discSaving, setDiscSaving] = useState(false);
  const [discEditorOpen, setDiscEditorOpen] = useState(false);
  const [discEditorMode, setDiscEditorMode] = useState<"add" | "edit">("add");
  const [discEditorInitial, setDiscEditorInitial] = useState<DisciplineCardDraft>({
    disciplineId: "musique",
    specialties: [],
  });
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
        .select("email, name, photo_url, plan, subscription_status, stripe_customer_id, stripe_subscription_id, pro_current_period_end, pro_cancel_at_period_end, loyalty_tier, loyalty_annual_volume, dashboard, tax_status_acknowledged, tax_status_acknowledged_at")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setEmail(String((prof as { email?: string })?.email || user.email || ""));
      setDisplayName(String((prof as { name?: string })?.name || ""));
      setPhotoUrl(((prof as { photo_url?: string | null })?.photo_url as string | null) ?? null);
      setPlan(String((prof as { plan?: string | null })?.plan || "free"));
      setSubscriptionStatus((prof as { subscription_status?: string | null } | null)?.subscription_status ?? null);
      setStripeCustomerId((prof as { stripe_customer_id?: string | null } | null)?.stripe_customer_id?.trim() || null);
      setProCurrentPeriodEnd((prof as { pro_current_period_end?: string | null } | null)?.pro_current_period_end ?? null);
      setProCancelAtPeriodEnd(Boolean((prof as { pro_cancel_at_period_end?: boolean | null } | null)?.pro_cancel_at_period_end));
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
      const row = data as TeacherRow & {
        stripe_account_id?: string | null;
        video_url?: string | null;
        is_public?: boolean | null;
        deactivated_at?: string | null;
        deleted_at?: string | null;
        intro_session_enabled?: boolean | null;
        intro_session_price_cents?: number | null;
      };
      setTeacherId(row.id);
      setTeacherIsPublic(row.is_public !== false && !row.deactivated_at && !row.deleted_at);
      setBio(row.bio || "");
      setHourly(String(row.price_per_lesson ?? ""));
      setIntroEnabled(row.intro_session_enabled === true);
      const introCents = typeof row.intro_session_price_cents === "number" ? row.intro_session_price_cents : null;
      setIntroCustomPrice(introCents != null && Number.isFinite(introCents) && introCents > 0 ? String(Math.round(introCents) / 100) : "");
      setTeachingMode(row.teaching_mode || "both");
      setStripeAccountId(row.stripe_account_id?.trim() || null);
      setVideoUrl(row.video_url ?? "");
      const loc = (row.location || {}) as Record<string, unknown>;
      setLocationJson(loc);
      setCity(typeof loc.neighborhood === "string" ? loc.neighborhood : "");

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

  const disciplineCards = useMemo<DisciplineCard[]>(() => {
    const map = new Map<string, { specs: string[]; minSort: number }>();
    for (const r of discRows) {
      const id = r.discipline_id;
      if (!id) continue;
      const spec = normalizeSpec(r.specialite);
      const cur = map.get(id) ?? { specs: [], minSort: r.sort_order ?? 0 };
      cur.minSort = Math.min(cur.minSort, r.sort_order ?? 0);
      if (spec) cur.specs.push(spec);
      map.set(id, cur);
    }
    const cards: DisciplineCard[] = Array.from(map.entries()).map(([disciplineId, v]) => ({
      disciplineId,
      specialties: Array.from(new Set(v.specs.map((x) => x.toLowerCase()))).map(
        (k) => v.specs.find((s) => s.toLowerCase() === k)!,
      ),
      minSort: v.minSort,
    }));
    cards.sort((a, b) => a.minSort - b.minSort);
    return cards;
  }, [discRows]);

  const openAddDiscipline = () => {
    const enabled = getEnabledDisciplines();
    setDiscEditorMode("add");
    setDiscEditorInitial({ disciplineId: enabled[0]?.id ?? "musique", specialties: [] });
    setDiscEditorOpen(true);
  };

  const openEditDiscipline = (card: DisciplineCard) => {
    setDiscEditorMode("edit");
    setDiscEditorInitial({ disciplineId: card.disciplineId, specialties: card.specialties });
    setDiscEditorOpen(true);
  };

  const deleteDisciplineCard = async (disciplineId: string) => {
    if (!teacherId) return;
    if (disciplineCards.length <= 1) {
      setMessage(t("disciplineValidationRequired"));
      return;
    }
    setDiscSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("teacher_disciplines").delete().eq("teacher_id", teacherId).eq("discipline_id", disciplineId);
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

  const saveDisciplineCard = async (draft: DisciplineCardDraft) => {
    if (!teacherId) return;
    const nextSpecs = draft.specialties.map((s) => normalizeSpec(s)).filter(Boolean);
    if (nextSpecs.length === 0) {
      setMessage(t("specialtyValidationRequired"));
      return;
    }
    const exists = disciplineCards.some((c) => c.disciplineId === draft.disciplineId);
    if (discEditorMode === "add" && disciplineCards.length >= 3 && !exists) {
      setMessage(t("maxDisciplinesReached"));
      return;
    }
    setDiscSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();

    // If editing, clear all rows for that discipline (replace set of specialties).
    await supabase.from("teacher_disciplines").delete().eq("teacher_id", teacherId).eq("discipline_id", draft.disciplineId);

    const baseSort =
      disciplineCards.find((c) => c.disciplineId === draft.disciplineId)?.minSort ??
      (disciplineCards.length ? Math.max(...disciplineCards.map((c) => c.minSort)) + 100 : 0);

    const inserts = nextSpecs.map((spec, i) => ({
      teacher_id: teacherId,
      discipline_id: draft.disciplineId,
      specialite: spec,
      sort_order: baseSort + i,
    }));
    const { error: insErr } = await supabase.from("teacher_disciplines").insert(inserts);
    if (insErr) {
      setMessage(insErr.message);
      setDiscSaving(false);
      return;
    }
    await syncTeacherPrimaryFromDisciplines(supabase, teacherId);
    await reloadDisciplines(teacherId);
    setDiscSaving(false);
    setDiscEditorOpen(false);
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
        intro_session_enabled: introEnabled,
        intro_session_duration_minutes: 45,
        intro_session_discount_percent: 50,
        intro_session_price_cents: (() => {
          const dollars = Number(String(introCustomPrice || "").trim());
          if (!Number.isFinite(dollars) || dollars <= 0) return null;
          return Math.max(0, Math.round(dollars * 100));
        })(),
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

  const toggleProfileVisibility = async () => {
    if (!teacherId) return;
    const nextPublic = !teacherIsPublic;
    setVisibilitySaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("teachers")
      .update({
        is_public: nextPublic,
        deactivated_at: nextPublic ? null : new Date().toISOString(),
      })
      .eq("id", teacherId);
    if (error) {
      setMessage(error.message);
    } else {
      setTeacherIsPublic(nextPublic);
      setMessage(nextPublic ? t("profileReactivatedSuccess") : t("profileHiddenSuccess"));
    }
    setVisibilitySaving(false);
  };

  const startProCheckout = async () => {
    const supabase = getSupabaseClient();
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) {
      setMessage(t("sessionExpiredShort"));
      return;
    }
    setProBusy(true);
    setMessage(null);
    setProMessage(null);
    try {
      const res = await fetch("/api/stripe/pro/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setProMessage(body.error || t("proCheckoutFailed"));
        return;
      }
      window.location.href = body.url;
    } catch {
      setProMessage(t("proCheckoutFailed"));
    } finally {
      setProBusy(false);
    }
  };

  const openBillingPortal = async () => {
    const supabase = getSupabaseClient();
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) {
      setMessage(t("sessionExpiredShort"));
      return;
    }
    setProBusy(true);
    setMessage(null);
    setProMessage(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setProMessage(body.error || t("stripePortalUnavailable"));
        return;
      }
      window.location.href = body.url;
    } catch {
      setProMessage(t("stripePortalUnavailable"));
    } finally {
      setProBusy(false);
    }
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
  const hasProSubscription = Boolean(stripeCustomerId || subscriptionStatus);
  const normalizedSubStatus = String(subscriptionStatus || "").toLowerCase();
  const proStatusLabel =
    proCancelAtPeriodEnd ? t("proCancelAtPeriodEnd") :
    normalizedSubStatus === "active" || normalizedSubStatus === "trialing" ? t("proSubscriptionActive") :
    normalizedSubStatus === "past_due" ? t("proSubscriptionPastDue") :
    normalizedSubStatus === "canceled" || normalizedSubStatus === "cancelled" ? t("proSubscriptionCanceled") :
    normalizedSubStatus || (plan === "pro" ? t("proSubscriptionActive") : t("planFreeLabel"));

  if (!user) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-[#DCEAE3] bg-white p-8 text-center shadow-[0_18px_54px_rgba(44,44,42,0.07)]">
        <p className="text-sm text-slate-600">{t("loginForSettings")}</p>
        <Link href="/" className="mt-4 inline-block text-[#00694c] font-medium underline">
          {t("teacherHome")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return <TeacherAccountSkeleton variant={variant} />;
  }

  if (!teacherId) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-amber-200 bg-white p-8 shadow-[0_18px_54px_rgba(44,44,42,0.07)]">
        <p className="text-sm font-semibold text-slate-800">{t("noTeacherAccountTitle")}</p>
        <p className="mt-2 text-sm text-slate-600">{t("noTeacherAccountBody")}</p>
      </div>
    );
  }

  const maxDisciplinesReached = disciplineCards.length >= 3;

  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 pb-16 sm:px-0">
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
          <section className={premiumPanelClass}>
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
              <div className="h-20 w-20 rounded-full bg-teal-600 text-white flex items-center justify-center text-lg font-bold border-2 border-white shadow">
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

        <div className="rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#2C2C2A]">{t("introSessionTitle")}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{t("introSessionDescription")}</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={introEnabled}
                onChange={(e) => setIntroEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#00694c]"
              />
              {t("enableIntroSession")}
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white border border-slate-200 p-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{t("introSessionDuration")}</p>
              <p className="mt-1 text-sm font-bold text-slate-900">45 min</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-3 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{t("introSessionPrice")}</p>
              <input
                value={introCustomPrice}
                onChange={(e) => setIntroCustomPrice(e.target.value)}
                disabled={!introEnabled}
                type="number"
                min={0}
                step="0.5"
                placeholder="(auto)"
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <p className="text-[11px] text-slate-500">
                {t("regularLesson")}: <span className="font-semibold text-slate-700">{hourly || "—"} $/h</span>
              </p>
            </div>
          </div>

          <p className="text-[11px] font-semibold text-slate-600">{t("introSessionOnePerTeacher")}</p>
        </div>
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
            <p className="text-[11px] text-teal-700 leading-relaxed">
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

      <section className={premiumPanelClass}>
        <h2 className="text-lg font-bold text-[#2C2C2A]">{t("teacherDisciplinesTitle")}</h2>
        <p className="text-sm leading-relaxed text-slate-600">{t("teacherDisciplinesDescription")}</p>
        {discLoading ? (
          <DisciplineEditorSkeleton />
        ) : (
          <>
            {disciplineCards.length === 0 ? (
              <p className="text-sm text-slate-600">{t("teacherDisciplinesEmpty")}</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {disciplineCards.map((card) => {
                  const meta = getDisciplineById(card.disciplineId);
                  const title = `${meta?.emoji ?? "✨"} ${meta?.label ?? card.disciplineId}`;
                  return (
                    <div key={card.disciplineId} className="rounded-2xl border border-[#DCEAE3] bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-[#2C2C2A]">{title}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {card.specialties.length ? card.specialties.join(" · ") : "—"}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            disabled={discSaving}
                            onClick={() => openEditDiscipline(card)}
                            className="h-9 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {t("editDiscipline")}
                          </button>
                          <button
                            type="button"
                            disabled={discSaving || disciplineCards.length <= 1}
                            onClick={() => void deleteDisciplineCard(card.disciplineId)}
                            className="h-9 rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700 hover:bg-rose-100/60 disabled:opacity-50"
                          >
                            {t("deleteDiscipline")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              disabled={discSaving || maxDisciplinesReached}
              onClick={openAddDiscipline}
              className={cn(
                "w-full py-3 rounded-xl border-2 border-dashed text-sm font-semibold",
                maxDisciplinesReached
                  ? "border-slate-200 text-slate-400 bg-slate-50"
                  : "border-[#00694c]/40 text-teal-700 hover:bg-teal-50/50",
              )}
            >
              {t("addDiscipline")}
            </button>
            {maxDisciplinesReached ? <p className="text-xs font-semibold text-slate-500">{t("maxDisciplinesReached")}</p> : null}

            <TeacherDisciplinesEditor
              open={discEditorOpen}
              mode={discEditorMode}
              initial={discEditorInitial}
              busy={discSaving}
              maxReached={maxDisciplinesReached}
              onClose={() => setDiscEditorOpen(false)}
              onSave={saveDisciplineCard}
            />
          </>
        )}
      </section>

      <section className={premiumPanelClass}>
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
                  on ? "border-[#00694c] bg-[rgba(0,105,76,0.12)] text-teal-700" : "border-slate-200 bg-slate-100 text-slate-600",
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
          <section className={premiumPanelClass}>
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

      <section className={premiumPanelClass}>
        <h2 className="text-lg font-bold text-[#2C2C2A]">{t("profileVisibilityTitle")}</h2>
        <p className="text-sm leading-relaxed text-slate-600">{t("profileVisibilityDescription")}</p>
        <div className="rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] px-4 py-3 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">{t("profileVisibilityTitle")}:</span>{" "}
          <span className="font-bold text-[#00694c]">
            {teacherIsPublic ? t("profileVisibleStatus") : t("profileHiddenStatus")}
          </span>
        </div>
        <button
          type="button"
          disabled={visibilitySaving}
          onClick={() => void toggleProfileVisibility()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border-2 border-[#2C2C2A]/15 bg-white px-5 text-sm font-semibold text-[#2C2C2A] disabled:opacity-60"
        >
          {visibilitySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {teacherIsPublic ? t("hideMyProfile") : t("reactivateMyProfile")}
        </button>
      </section>

      <section className={premiumPanelClass}>
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
        <div className="rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] px-4 py-3 text-sm text-slate-700 space-y-1">
          <p>
            <span className="font-semibold text-slate-900">Pro:</span>{" "}
            <span className="font-bold text-[#00694c]">{proStatusLabel}</span>
          </p>
          {proCurrentPeriodEnd ? (
            <p className="text-xs text-slate-600">
              {new Date(proCurrentPeriodEnd).toLocaleDateString(localeToBcp47(locale), {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          ) : null}
        </div>
        {plan === "pro" || hasProSubscription ? (
          <button
            type="button"
            disabled={proBusy}
            onClick={() => void openBillingPortal()}
            className="inline-flex h-10 px-5 rounded-full bg-[#00694c] hover:bg-[#008560] text-white text-sm font-semibold items-center justify-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-60"
          >
            {proBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {proBusy ? t("stripePortalOpening") : t("manageProSubscription")}
          </button>
        ) : (
          <button
            type="button"
            disabled={proBusy}
            onClick={() => void startProCheckout()}
            className="inline-flex h-10 px-5 rounded-full bg-[#00694c] hover:bg-[#008560] text-white text-sm font-semibold items-center justify-center gap-2 shadow-sm hover:shadow transition-all disabled:opacity-60"
          >
            {proBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {proBusy ? t("stripePortalOpening") : t("upgradeToPro")}
          </button>
        )}
        {proMessage ? (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {proMessage}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#DCEAE3] bg-white p-6 shadow-[0_18px_54px_rgba(44,44,42,0.07)] space-y-3">
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

      <AccountDeletionSection />

      <section className="rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-5 space-y-1.5">
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
