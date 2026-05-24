"use client";

/**
 * Teacher profile management (/teacher/verification)
 * -------------------------------------------------
 * Route stays /teacher/verification for compatibility. Visible labels use
 * "Gestion du profil" / "Profile management" — not Verification or Launch Center.
 *
 * Central editing hub with 7 sections:
 *   1. Public profile   2. Disciplines & formats   3. Offer & pricing
 *   4. Availability     5. Teaching zone           6. Trust
 *   7. Payments
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  CreditCard,
  GraduationCap,
  Loader2,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { IdentityVerificationCard } from "../../../../components/IdentityVerificationCard";
import { useLocale } from "../../../../lib/locale-context";
import { cn } from "../../../../lib/utils";
import { deriveVerificationState, deriveEffectiveZoneState, type VerificationStepState } from "../../../../lib/verificationState";
import { getDisciplineById, getEnabledDisciplines } from "../../../../lib/disciplines";
import { syncTeacherPrimaryFromDisciplines } from "../../../../lib/teacherDisciplines";
import { TeacherDisciplinesEditor, type DisciplineCardDraft } from "../../../../components/teacher/TeacherDisciplinesEditor";
import type { TranslationKey } from "../../../../lib/translations";
import { DiplomaStep } from "./components/DiplomaStep";
import { ZoneStep } from "./components/ZoneStep";
import { ProfileAiAssistant } from "../../../../components/teacher/ProfileAiAssistant";
import { AvatarUpload } from "../../../../components/profile/AvatarUpload";
import { TeacherPayoutPreview } from "../../../../components/teacher/TeacherPayoutPreview";
import { isValidVideoUrl } from "../../../../lib/videoEmbed";
import { parseGooglePlace } from "../../../../lib/googleAddressParser";
import { MIN_LESSON_PRICE_DOLLARS } from "../../../../lib/pricing/constants";

type TeacherVerifyRow = {
  id: string;
  name?: string | null;
  discipline?: string | null;
  bio?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  price_per_lesson?: number | null;
  teaching_mode?: string | null;
  intro_session_enabled?: boolean | null;
  intro_session_price_cents?: number | null;
  availability?: string[] | null;
  verification_level: number | null;
  identity_verified: boolean | null;
  identity_status: string | null;
  stripe_identity_status: string | null;
  stripe_identity_failed_reason: string | null;
  diploma_verified: boolean | null;
  diploma_url: string | null;
  phone_verified: boolean | null;
  is_verified: boolean | null;
  location_verification_status: string | null;
  cv_summary: string | null;
  cv_verification_status: string | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
  home_lesson_radius_km?: number | null;
  location?: unknown;
  home_lesson_enabled?: boolean | null;
  stripe_connect_onboarding_complete?: boolean | null;
  stripe_connect_charges_enabled?: boolean | null;
  stripe_connect_payouts_enabled?: boolean | null;
  stripe_account_id?: string | null;
};

const TEACHER_IMAGE_URL_FALLBACK = "https://picsum.photos/seed/teacher/400/400";

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

function teachingModeToChips(mode: string | null | undefined) {
  const m = mode || "both";
  return {
    person: m === "person" || m === "both" || m === "all",
    online: m === "online" || m === "both" || m === "all",
    home: m === "home" || m === "all",
  };
}

function normalizeSpec(s: string | null | undefined): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

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

export default function TeacherProfileManagementPage() {
  const { user, profile, loading } = useAuth();
  const { t } = useLocale();
  const searchParams = useSearchParams();

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"ok" | "error">("ok");
  const [teacherRow, setTeacherRow] = useState<TeacherVerifyRow | null>(null);
  const [plan, setPlan] = useState<string>("free");

  // Which card is currently expanded inline
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Profile inline editing
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editVideoError, setEditVideoError] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profileAiOpen, setProfileAiOpen] = useState(false);
  const [profileAiNotes, setProfileAiNotes] = useState("");

  // Disciplines (teacher_disciplines table) + teaching mode chips
  const [discRows, setDiscRows] = useState<TeacherDisciplineDbRow[]>([]);
  const [discLoading, setDiscLoading] = useState(true);
  const [discSaving, setDiscSaving] = useState(false);
  const [discEditorOpen, setDiscEditorOpen] = useState(false);
  const [discEditorMode, setDiscEditorMode] = useState<"add" | "edit">("add");
  const [discEditorInitial, setDiscEditorInitial] = useState<DisciplineCardDraft>({
    disciplineId: "musique",
    specialties: [],
  });
  const [chipsPerson, setChipsPerson] = useState(true);
  const [chipsOnline, setChipsOnline] = useState(true);
  const [chipsHome, setChipsHome] = useState(false);

  // Pricing / offer
  const [editPrice, setEditPrice] = useState("");
  const [editIntroEnabled, setEditIntroEnabled] = useState(false);
  const [editIntroPrice, setEditIntroPrice] = useState("");

  // Zone form state
  const [zoneShowManual, setZoneShowManual] = useState(false);
  const [zoneSingleLine, setZoneSingleLine] = useState("");
  const [zoneHasPrivateAddress, setZoneHasPrivateAddress] = useState(false);
  const [zoneAddressLine1, setZoneAddressLine1] = useState("");
  const [zoneAddressLine2, setZoneAddressLine2] = useState("");
  const [zoneCity, setZoneCity] = useState("");
  const [zoneRegion, setZoneRegion] = useState("");
  const [zonePostalCode, setZonePostalCode] = useState("");
  const [zoneCountryCode, setZoneCountryCode] = useState("");
  const [zoneRadiusKm, setZoneRadiusKm] = useState("");
  const [zoneSavedStatus, setZoneSavedStatus] = useState<string | null>(null);
  const [zoneFuzzRadiusKm, setZoneFuzzRadiusKm] = useState<number | null>(null);
  const [zoneLat, setZoneLat] = useState<number | null>(null);
  const [zoneLng, setZoneLng] = useState<number | null>(null);

  // Diploma file state
  const [diplomaFile, setDiplomaFile] = useState<File | null>(null);
  const [diplomaNote, setDiplomaNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const redirectHandledRef = useRef(false);

  // Google Places autocomplete for Zone card
  const [googleReady, setGoogleReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.google?.maps?.places),
  );
  const [googleError, setGoogleError] = useState(
    () => !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  );
  const zoneAddressRef = useRef<HTMLInputElement | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    const [{ data: tr }, { data: p }] = await Promise.all([
      supabase
        .from("teachers")
        .select(
          "id, name, discipline, bio, image_url, video_url, price_per_lesson, teaching_mode, intro_session_enabled, intro_session_price_cents, availability, verification_level, identity_verified, identity_status, stripe_identity_status, stripe_identity_failed_reason, diploma_verified, diploma_url, phone_verified, is_verified, location_verification_status, cv_summary, cv_verification_status, city, region, country_code, home_lesson_radius_km, home_lesson_enabled, location, stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("profiles").select("plan, photo_url").eq("id", user.id).maybeSingle(),
    ]);
    setTeacherRow(tr as TeacherVerifyRow | null);
    setPlan(String((p as { plan?: string } | null)?.plan || "free"));
    setProfilePhotoUrl((p as { photo_url?: string | null } | null)?.photo_url ?? null);
    if (tr?.id) {
      const { data: drows } = await supabase
        .from("teacher_disciplines")
        .select("id, discipline_id, specialite, sort_order")
        .eq("teacher_id", tr.id)
        .order("sort_order", { ascending: true });
      setDiscRows((drows as TeacherDisciplineDbRow[]) ?? []);
      setDiscLoading(false);
    } else {
      setDiscRows([]);
      setDiscLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Pre-populate forms from loaded teacher data
  useEffect(() => {
    if (!teacherRow) return;
    setEditName(teacherRow.name ?? "");
    setEditBio(teacherRow.bio ?? "");
    setEditVideoUrl(teacherRow.video_url ?? "");
    setEditPrice(teacherRow.price_per_lesson != null ? String(teacherRow.price_per_lesson) : "");
    setEditIntroEnabled(teacherRow.intro_session_enabled === true);
    const introCents =
      typeof teacherRow.intro_session_price_cents === "number" ? teacherRow.intro_session_price_cents : null;
    setEditIntroPrice(introCents != null && introCents > 0 ? String(introCents / 100) : "");
    const chips = teachingModeToChips(teacherRow.teaching_mode);
    setChipsPerson(chips.person);
    setChipsOnline(chips.online);
    setChipsHome(chips.home);

    setZoneCity(teacherRow.city ?? "");
    setZoneRegion(teacherRow.region ?? "");
    setZoneCountryCode(teacherRow.country_code ?? "");
    setZoneRadiusKm(
      teacherRow.home_lesson_radius_km != null ? String(teacherRow.home_lesson_radius_km) : "",
    );
    const loc =
      typeof teacherRow.location === "object" && teacherRow.location !== null
        ? (teacherRow.location as Record<string, unknown>)
        : {};
    const priv =
      typeof loc.private === "object" && loc.private !== null
        ? (loc.private as Record<string, unknown>)
        : {};
    const savedLine1 = typeof priv.address_line1 === "string" ? priv.address_line1 : "";
    setZoneAddressLine1(savedLine1);
    setZoneAddressLine2(typeof priv.address_line2 === "string" ? priv.address_line2 : "");
    setZonePostalCode(typeof priv.postal_code === "string" ? priv.postal_code : "");
    setZoneSingleLine(savedLine1);
    setZoneHasPrivateAddress(Boolean(savedLine1));
    if (teacherRow.location_verification_status) {
      setZoneSavedStatus(teacherRow.location_verification_status);
    }
    if (typeof loc.fuzz_radius_km === "number") {
      setZoneFuzzRadiusKm(loc.fuzz_radius_km);
    }
  }, [teacherRow]);

  // ── Google Maps script loader ────────────────────────────────────────────────
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return;
    if (typeof window !== "undefined" && window.google?.maps?.places) {
      setGoogleReady(true);
      return;
    }
    let cancelled = false;
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
    script.onload = () => {
      if (cancelled) return;
      if (window.google?.maps?.places) setGoogleReady(true);
      else setGoogleError(true);
    };
    script.onerror = () => {
      if (!cancelled) setGoogleError(true);
    };
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, []);

  // Wire up Google Places autocomplete when zone card is expanded and script ready
  useEffect(() => {
    if (!googleReady || expandedCard !== "zone") return;
    const el = zoneAddressRef.current;
    if (!el) return;
    if (!("google" in window)) return;
    const ac = new google.maps.places.Autocomplete(el, {
      fields: ["address_components", "formatted_address", "geometry"],
      types: ["address"],
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const parsed = parseGooglePlace(place);
      if (parsed.formattedAddress) setZoneSingleLine(parsed.formattedAddress);
      if (parsed.city) setZoneCity(parsed.city);
      if (parsed.region) setZoneRegion(parsed.region);
      if (parsed.countryCode) setZoneCountryCode(parsed.countryCode);
      if (parsed.streetNumber || parsed.route) {
        const line1 = [parsed.streetNumber, parsed.route].filter(Boolean).join(" ");
        setZoneAddressLine1(line1);
      }
      if (parsed.postalCode) setZonePostalCode(parsed.postalCode);
      if (parsed.latitude != null && parsed.longitude != null) {
        setZoneLat(parsed.latitude);
        setZoneLng(parsed.longitude);
      }
    });
  }, [googleReady, expandedCard]);

  const showMsg = useCallback((text: string, kind: "ok" | "error" = "ok") => {
    setMessage(text);
    setMessageKind(kind);
  }, []);

  // Redirect banner for Stripe Identity return
  useEffect(() => {
    if (redirectHandledRef.current) return;
    redirectHandledRef.current = true;
    if (searchParams.get("identity") !== "completed") return;
    showMsg(t("stripeIdSubmitted"), "ok");
    void load();
  }, [searchParams, showMsg, load, t]);

  // ── Profile save ────────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!user?.id || !teacherRow?.id) return;
    const trimmedVideo = editVideoUrl.trim();
    if (trimmedVideo && !isValidVideoUrl(trimmedVideo)) {
      setEditVideoError(t("invalidVideoUrl"));
      return;
    }
    setEditVideoError(null);
    setBusy("profile");
    setMessage(null);
    try {
      const supabase = getSupabaseClient();
      const nextTeacherImageUrl =
        (profilePhotoUrl && profilePhotoUrl.trim()) ||
        (teacherRow.image_url && teacherRow.image_url.trim()) ||
        TEACHER_IMAGE_URL_FALLBACK;
      const { error: err1 } = await supabase
        .from("teachers")
        .update({
          name: editName.trim() || null,
          bio: editBio.trim() || null,
          video_url: trimmedVideo || null,
          image_url: nextTeacherImageUrl,
        })
        .eq("id", teacherRow.id);
      if (err1) throw err1;
      const { error: err2 } = await supabase
        .from("profiles")
        .update({ name: editName.trim() || null, photo_url: profilePhotoUrl })
        .eq("id", user.id);
      if (err2) throw err2;
      showMsg(t("savedOk"), "ok");
      setExpandedCard(null);
      await load();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : t("anErrorOccurred"), "error");
    } finally {
      setBusy(null);
    }
  };

  const saveDisciplinesFormats = async () => {
    if (!teacherRow?.id) return;
    setBusy("disciplines");
    setMessage(null);
    try {
      const supabase = getSupabaseClient();
      const teachingMode = encodeTeachingMode(chipsPerson, chipsOnline, chipsHome);
      const { error } = await supabase
        .from("teachers")
        .update({ teaching_mode: teachingMode })
        .eq("id", teacherRow.id);
      if (error) throw error;
      showMsg(t("savedOk"), "ok");
      setExpandedCard(null);
      await load();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : t("anErrorOccurred"), "error");
    } finally {
      setBusy(null);
    }
  };

  const reloadDisciplines = async (teacherId: string) => {
    const supabase = getSupabaseClient();
    const { data: drows } = await supabase
      .from("teacher_disciplines")
      .select("id, discipline_id, specialite, sort_order")
      .eq("teacher_id", teacherId)
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
    return Array.from(map.entries())
      .map(([disciplineId, v]) => ({
        disciplineId,
        specialties: Array.from(new Set(v.specs.map((x) => x.toLowerCase()))).map(
          (k) => v.specs.find((s) => s.toLowerCase() === k)!,
        ),
        minSort: v.minSort,
      }))
      .sort((a, b) => a.minSort - b.minSort);
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
    if (!teacherRow?.id) return;
    if (disciplineCards.length <= 1) {
      showMsg(t("disciplineValidationRequired"), "error");
      return;
    }
    setDiscSaving(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("teacher_disciplines")
      .delete()
      .eq("teacher_id", teacherRow.id)
      .eq("discipline_id", disciplineId);
    if (error) {
      showMsg(error.message, "error");
      setDiscSaving(false);
      return;
    }
    await syncTeacherPrimaryFromDisciplines(supabase, teacherRow.id);
    await reloadDisciplines(teacherRow.id);
    await load();
    setDiscSaving(false);
    showMsg(t("savedOk"), "ok");
  };

  const saveDisciplineCard = async (draft: DisciplineCardDraft) => {
    if (!teacherRow?.id) return;
    const nextSpecs = draft.specialties.map((s) => normalizeSpec(s)).filter(Boolean);
    if (nextSpecs.length === 0) {
      showMsg(t("specialtyValidationRequired"), "error");
      return;
    }
    const exists = disciplineCards.some((c) => c.disciplineId === draft.disciplineId);
    if (discEditorMode === "add" && disciplineCards.length >= 3 && !exists) {
      showMsg(t("maxDisciplinesReached"), "error");
      return;
    }
    setDiscSaving(true);
    const supabase = getSupabaseClient();
    await supabase
      .from("teacher_disciplines")
      .delete()
      .eq("teacher_id", teacherRow.id)
      .eq("discipline_id", draft.disciplineId);
    const baseSort =
      disciplineCards.find((c) => c.disciplineId === draft.disciplineId)?.minSort ??
      (disciplineCards.length ? Math.max(...disciplineCards.map((c) => c.minSort)) + 100 : 0);
    const inserts = nextSpecs.map((spec, i) => ({
      teacher_id: teacherRow.id,
      discipline_id: draft.disciplineId,
      specialite: spec,
      sort_order: baseSort + i,
    }));
    const { error: insErr } = await supabase.from("teacher_disciplines").insert(inserts);
    if (insErr) {
      showMsg(insErr.message, "error");
      setDiscSaving(false);
      return;
    }
    await syncTeacherPrimaryFromDisciplines(supabase, teacherRow.id);
    await reloadDisciplines(teacherRow.id);
    await load();
    setDiscSaving(false);
    setDiscEditorOpen(false);
    showMsg(t("savedOk"), "ok");
  };

  const toggleFormat = (key: "person" | "online" | "home") => {
    if (key === "person") setChipsPerson((v) => !v);
    if (key === "online") setChipsOnline((v) => !v);
    if (key === "home") setChipsHome((v) => !v);
  };

  // ── Pricing save ────────────────────────────────────────────────────────────
  const savePricing = async () => {
    if (!user?.id) return;
    const priceNum = Number(editPrice);
    if (!Number.isFinite(priceNum) || priceNum < MIN_LESSON_PRICE_DOLLARS) {
      showMsg(t("pricingMinLessonPrice"), "error");
      return;
    }
    const introPriceCents = (() => {
      const dollars = Number(String(editIntroPrice || "").trim());
      if (!Number.isFinite(dollars) || dollars <= 0) return null;
      return Math.max(0, Math.round(dollars * 100));
    })();
    setBusy("pricing");
    setMessage(null);
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error(t("verificationSessionExpired"));
      const res = await fetch("/api/teacher/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          price_per_lesson: priceNum,
          intro_session_enabled: editIntroEnabled,
          intro_session_price_cents: introPriceCents,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(j.error || t("anErrorOccurred"));
      showMsg(t("savedOk"), "ok");
      setExpandedCard(null);
      await load();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : t("anErrorOccurred"), "error");
    } finally {
      setBusy(null);
    }
  };

  // ── Zone save ────────────────────────────────────────────────────────────────
  const submitZone = async () => {
    if (!user) return;
    setMessage(null);
    setBusy("zone");
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error(t("verificationSessionExpired"));

      const city = zoneCity.trim();
      const region = zoneRegion.trim();
      const countryCode = zoneCountryCode.trim();
      const addressLine1 = zoneShowManual
        ? zoneAddressLine1.trim() || undefined
        : zoneSingleLine.trim() || undefined;
      const addressLine2 = zoneShowManual ? zoneAddressLine2.trim() || undefined : undefined;
      const postalCode = zonePostalCode.trim() || undefined;

      const res = await fetch("/api/teacher/location/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          address_line1: addressLine1,
          address_line2: addressLine2,
          city,
          region,
          postal_code: postalCode,
          country_code: countryCode,
          home_lesson_radius_km: zoneRadiusKm.trim() ? Number(zoneRadiusKm.trim()) : undefined,
          ...(zoneLat != null && zoneLng != null ? { lat: zoneLat, lng: zoneLng } : {}),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        status?: string;
        fuzz_radius_km?: number;
        geocoded?: boolean;
      };
      if (!res.ok || !j.ok) throw new Error(j.error || t("verificationErrorGeneric"));
      setZoneSavedStatus(j.status ?? "pending");
      setZoneFuzzRadiusKm(j.fuzz_radius_km ?? null);
      setZoneHasPrivateAddress(true);
      showMsg(j.geocoded ? t("zoneSavedApproximate") : t("zoneSavedPending"), "ok");
      setExpandedCard(null);
      await load();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : t("verificationErrorGeneric"), "error");
    } finally {
      setBusy(null);
    }
  };

  // ── Identity (email fallback) ────────────────────────────────────────────────
  const sendEmailRequest = async (kind: "identity" | "diploma", description?: string) => {
    setMessage(null);
    setBusy(kind);
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error(t("verificationSessionExpired"));
      const res = await fetch("/api/teacher/verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind, description }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || t("verificationSendFailed"));
      showMsg(kind === "identity" ? t("verificationSentIdentity") : t("verificationSentDiploma"), "ok");
    } catch (e) {
      showMsg(e instanceof Error ? e.message : t("verificationErrorGeneric"), "error");
    } finally {
      setBusy(null);
    }
  };

  // ── Diploma upload ───────────────────────────────────────────────────────────
  const uploadDiploma = async () => {
    if (!diplomaFile || !user) return;
    setMessage(null);
    setBusy("diploma");
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error(t("verificationSessionExpired"));

      const form = new FormData();
      form.append("file", diplomaFile);
      if (diplomaNote.trim()) form.append("note", diplomaNote.trim());

      const res = await fetch("/api/teacher/diploma", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || t("uploadFailed"));

      showMsg(t("diplomaUploadSuccess"), "ok");
      setDiplomaFile(null);
      setDiplomaNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setExpandedCard(null);
      await load();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : t("verificationErrorGeneric"), "error");
    } finally {
      setBusy(null);
    }
  };

  // ── Loading / access guards ──────────────────────────────────────────────────
  if (loading || !user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#6B6A65]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  if (profile?.role !== "teacher") {
    return (
      <div className="rounded-2xl border border-[#E8E6DF] bg-white p-8 text-center">
        <p className="text-[#2C2C2A] font-semibold">{t("verificationTeachersOnly")}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-teal-700 hover:underline">
          {t("back")}
        </Link>
      </div>
    );
  }

  if (!teacherRow) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-[#633806]">
        {t("verificationNoTeacherRow")}
      </div>
    );
  }

  const vState = deriveVerificationState({
    plan,
    identity_verified: teacherRow.identity_verified,
    identity_status: teacherRow.identity_status,
    stripe_identity_status: teacherRow.stripe_identity_status,
    stripe_identity_failed_reason: teacherRow.stripe_identity_failed_reason,
    diploma_verified: teacherRow.diploma_verified,
    diploma_url: teacherRow.diploma_url,
    location_verification_status: teacherRow.location_verification_status,
    cv_verification_status: teacherRow.cv_verification_status,
    cv_summary: teacherRow.cv_summary,
    bio: teacherRow.bio ?? null,
    is_verified: teacherRow.is_verified,
    verification_level: teacherRow.verification_level,
  });

  const stripeStatus = (teacherRow.stripe_identity_status ?? null) as
    | "not_started"
    | "requires_input"
    | "processing"
    | "verified"
    | "failed"
    | "canceled"
    | null;

  const paymentsReady = Boolean(
    teacherRow.stripe_connect_onboarding_complete &&
      teacherRow.stripe_connect_charges_enabled &&
      teacherRow.stripe_connect_payouts_enabled,
  );
  const paymentsState: VerificationStepState = paymentsReady
    ? { kind: "verified" }
    : teacherRow.stripe_account_id
      ? { kind: "pending" }
      : { kind: "not_started" };

  // Derived card states
  const profileState: VerificationStepState =
    (teacherRow.bio?.trim() ?? "") && (teacherRow.name?.trim() ?? "")
      ? { kind: "verified" }
      : { kind: "not_started" };

  const disciplinesState: VerificationStepState =
    disciplineCards.length > 0 ? { kind: "verified" } : { kind: "not_started" };

  const primaryDisciplineForAi = (() => {
    const first = disciplineCards[0];
    if (!first) return "";
    const meta = getDisciplineById(first.disciplineId);
    return meta?.label ?? first.disciplineId;
  })();

  const primarySpecialtyForAi = disciplineCards[0]?.specialties.join(", ") ?? "";

  const zoneState: VerificationStepState = deriveEffectiveZoneState({
    location_verification_status: teacherRow.location_verification_status,
    zoneSavedStatus,
    hasPrivateAddress: zoneHasPrivateAddress,
    city: teacherRow.city,
  });

  const pricingState: VerificationStepState =
    (teacherRow.price_per_lesson ?? 0) > 0 ? { kind: "verified" } : { kind: "not_started" };

  const trustState: VerificationStepState =
    vState.identity.kind === "verified" || vState.diploma.kind === "verified"
      ? { kind: "verified" }
      : vState.identity.kind === "pending" || vState.diploma.kind === "pending"
        ? { kind: "pending" }
        : { kind: "not_started" };

  const publicProfileHref = `/teacher/profile/${teacherRow.id}`;

  const availabilityState: VerificationStepState =
    (teacherRow.availability?.length ?? 0) > 0 ? { kind: "verified" } : { kind: "not_started" };

  const toggleCard = (key: string) => {
    setExpandedCard((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-8" data-testid="teacher-profile-management-page">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherSpaceLabel")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A] flex items-center gap-2">
          <User className="text-teal-700" size={26} aria-hidden />
          {t("teacherProfileManagementTitle")}
        </h1>
        <p className="mt-2 text-sm text-[#6B6A65] max-w-xl">{t("teacherProfileManagementSubtitle")}</p>
      </div>

      {message ? (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-medium",
            messageKind === "ok"
              ? "bg-teal-50 text-teal-800 border border-teal-500/25"
              : "bg-red-50 text-red-800 border border-red-200",
          )}
        >
          {message}
        </div>
      ) : null}

      <section data-testid="teacher-profile-mgmt-section-public-profile" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherProfileMgmtSectionPublicProfile")}
        </h2>
        <LaunchCard
          cardKey="profile"
          icon={<User size={18} aria-hidden />}
          title={t("teacherProfileMgmtSectionPublicProfile")}
          description={t("teacherLaunchCardProfileDesc")}
          state={profileState}
          expandedCard={expandedCard}
          onToggle={() => toggleCard("profile")}
          t={t}
          data-testid="teacher-profile-mgmt-card-public-profile"
        >
          <div className="space-y-4 pt-3">
            <AvatarUpload
              userId={user.id}
              displayName={editName || user.email || "Teacher"}
              currentPhotoUrl={profilePhotoUrl}
              onPhotoUrlChange={setProfilePhotoUrl}
            />
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
                {t("profileDisplayName")}
              </span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-2 w-full h-11 rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
                {t("bioLabel")}
              </span>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-[#E8E6DF] px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <div>
              <button
                type="button"
                onClick={() => setProfileAiOpen((v) => !v)}
                className="text-xs font-semibold text-teal-700 hover:underline"
                data-testid="teacher-profile-mgmt-ai-toggle"
              >
                {profileAiOpen ? "▾ " : "✨ "}
                {t("aiAssistantHeadline")}
              </button>
              {profileAiOpen ? (
                <div className="mt-2">
                  <ProfileAiAssistant
                    discipline={primaryDisciplineForAi || getEnabledDisciplines()[0]?.label || "Musique"}
                    specialty={primarySpecialtyForAi}
                    notes={profileAiNotes}
                    onNotesChange={setProfileAiNotes}
                    onAccept={(next) => {
                      setEditBio(next);
                      setProfileAiOpen(false);
                    }}
                    compact
                  />
                </div>
              ) : null}
            </div>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
                {t("videoPresentationLabel")}
              </span>
              <span className="ml-2 text-[10px] font-bold uppercase text-[#6B6A65]">{t("optionalBadge")}</span>
              <input
                value={editVideoUrl}
                onChange={(e) => {
                  setEditVideoUrl(e.target.value);
                  setEditVideoError(null);
                }}
                className="mt-2 w-full h-11 rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none focus:border-teal-500"
                placeholder="https://youtube.com/..."
              />
              {editVideoError ? <p className="mt-1 text-xs text-red-600">{editVideoError}</p> : null}
            </label>
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={busy === "profile"}
              className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {busy === "profile" ? <Loader2 size={16} className="animate-spin" /> : null}
              {t("teacherLaunchCardProfileSaveBtn")}
            </button>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/teacher/my-profile"
                className="text-sm font-semibold text-teal-700 hover:underline"
                data-testid="teacher-profile-mgmt-preview-link"
              >
                {t("teacherPublicProfileLabel")} →
              </Link>
              <a
                href={publicProfileHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-teal-700 hover:underline"
                data-testid="teacher-profile-mgmt-view-public-link"
              >
                {t("teacherPublicProfileViewCta")}
              </a>
            </div>
          </div>
        </LaunchCard>
      </section>

      <section data-testid="teacher-profile-mgmt-section-disciplines-formats" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherProfileMgmtSectionDisciplinesFormats")}
        </h2>
        <LaunchCard
          cardKey="disciplines"
          icon={<GraduationCap size={18} aria-hidden />}
          title={t("teacherProfileMgmtSectionDisciplinesFormats")}
          description={t("teacherProfileMgmtDisciplinesDesc")}
          state={disciplinesState}
          expandedCard={expandedCard}
          onToggle={() => toggleCard("disciplines")}
          t={t}
          data-testid="teacher-profile-mgmt-card-disciplines-formats"
        >
          <div className="space-y-4 pt-3">
            {discLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
            ) : (
              <>
                {disciplineCards.length === 0 ? (
                  <p className="text-sm text-[#6B6A65]">{t("teacherDisciplinesEmpty")}</p>
                ) : (
                  <div className="space-y-3">
                    {disciplineCards.map((card) => {
                      const meta = getDisciplineById(card.disciplineId);
                      const title = `${meta?.emoji ?? "✨"} ${meta?.label ?? card.disciplineId}`;
                      return (
                        <div
                          key={card.disciplineId}
                          className="rounded-xl border border-[#E8E6DF] bg-white p-4"
                          data-testid="teacher-profile-mgmt-discipline-card"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#2C2C2A]">{title}</p>
                              <p className="mt-1 text-sm text-[#6B6A65]">
                                {card.specialties.length ? card.specialties.join(" · ") : "—"}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                disabled={discSaving}
                                onClick={() => openEditDiscipline(card)}
                                className="h-9 rounded-full border border-[#E8E6DF] px-3 text-xs font-semibold text-[#2C2C2A] hover:bg-slate-50 disabled:opacity-50"
                              >
                                {t("editDiscipline")}
                              </button>
                              <button
                                type="button"
                                disabled={discSaving || disciplineCards.length <= 1}
                                onClick={() => void deleteDisciplineCard(card.disciplineId)}
                                className="h-9 rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
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
                  disabled={discSaving || disciplineCards.length >= 3}
                  onClick={openAddDiscipline}
                  className={cn(
                    "w-full py-3 rounded-xl border-2 border-dashed text-sm font-semibold",
                    disciplineCards.length >= 3
                      ? "border-slate-200 text-slate-400 bg-slate-50"
                      : "border-teal-500/40 text-teal-700 hover:bg-teal-50/50",
                  )}
                  data-testid="teacher-profile-mgmt-add-discipline"
                >
                  {t("addDiscipline")}
                </button>
                {disciplineCards.length >= 3 ? (
                  <p className="text-xs text-[#6B6A65]">{t("maxDisciplinesReached")}</p>
                ) : null}
                <TeacherDisciplinesEditor
                  open={discEditorOpen}
                  mode={discEditorMode}
                  initial={discEditorInitial}
                  busy={discSaving}
                  maxReached={disciplineCards.length >= 3}
                  onClose={() => setDiscEditorOpen(false)}
                  onSave={saveDisciplineCard}
                />
              </>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">{t("sectionFormat")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["inPerson", "online", "homeVisit"] as const).map((labelKey, i) => {
                  const keys = ["person", "online", "home"] as const;
                  const on =
                    keys[i] === "person" ? chipsPerson : keys[i] === "online" ? chipsOnline : chipsHome;
                  return (
                    <button
                      key={labelKey}
                      type="button"
                      onClick={() => toggleFormat(keys[i])}
                      className={cn(
                        "h-10 px-4 rounded-full text-sm font-semibold border",
                        on
                          ? "border-teal-600 bg-teal-500/10 text-teal-800"
                          : "border-[#E8E6DF] bg-slate-50 text-slate-600",
                      )}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void saveDisciplinesFormats()}
              disabled={busy === "disciplines"}
              className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {busy === "disciplines" ? <Loader2 size={16} className="animate-spin" /> : null}
              {t("teacherProfileMgmtDisciplinesSaveBtn")}
            </button>
          </div>
        </LaunchCard>
      </section>

      <section data-testid="teacher-profile-mgmt-section-offer-pricing" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherProfileMgmtSectionOfferPricing")}
        </h2>
        <LaunchCard
          cardKey="pricing"
          icon={<BookOpen size={18} aria-hidden />}
          title={t("teacherProfileMgmtSectionOfferPricing")}
          description={t("teacherProfileMgmtOfferPricingDesc")}
          state={pricingState}
          expandedCard={expandedCard}
          onToggle={() => toggleCard("pricing")}
          t={t}
          data-testid="teacher-profile-mgmt-card-offer-pricing"
        >
          <div className="space-y-4 pt-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
                {t("profileHourlyRate")}
              </span>
              <input
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                type="number"
                min={MIN_LESSON_PRICE_DOLLARS}
                step="0.5"
                className="mt-2 w-full h-11 rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none focus:border-teal-500"
              />
              <p className="mt-1 text-xs text-[#6B6A65]">{t("pricingMinLessonPrice")}</p>
              <TeacherPayoutPreview grossAmount={editPrice} currency="CAD" teacherPlan={plan} />
            </label>
            <div className="rounded-xl border border-[#E8E6DF] bg-teal-50/40 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#2C2C2A]">{t("introSessionTitle")}</p>
                  <p className="mt-1 text-xs text-[#6B6A65]">{t("introSessionDescription")}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#2C2C2A]">
                  <input
                    type="checkbox"
                    checked={editIntroEnabled}
                    onChange={(e) => setEditIntroEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-700"
                  />
                  {t("enableIntroSession")}
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
                  {t("introSessionPrice")}
                </span>
                <input
                  value={editIntroPrice}
                  onChange={(e) => setEditIntroPrice(e.target.value)}
                  disabled={!editIntroEnabled}
                  type="number"
                  min={MIN_LESSON_PRICE_DOLLARS}
                  step="0.5"
                  placeholder="(auto)"
                  className="mt-2 w-full h-11 rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => void savePricing()}
              disabled={busy === "pricing"}
              className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {busy === "pricing" ? <Loader2 size={16} className="animate-spin" /> : null}
              {t("teacherProfileMgmtOfferPricingSaveBtn")}
            </button>
          </div>
        </LaunchCard>
      </section>

      <section data-testid="teacher-profile-mgmt-section-availability" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherProfileMgmtSectionAvailability")}
        </h2>
        <LaunchCard
          cardKey="availability"
          icon={<Calendar size={18} aria-hidden />}
          title={t("teacherProfileMgmtSectionAvailability")}
          description={t("teacherProfileMgmtAvailabilityDesc")}
          state={availabilityState}
          expandedCard={expandedCard}
          onToggle={null}
          t={t}
          data-testid="teacher-profile-mgmt-card-availability"
          ctaHref="/teacher/schedule"
          ctaLabel={t("teacherProfileMgmtAvailabilityCta")}
        />
      </section>

      <section data-testid="teacher-profile-mgmt-section-teaching-zone" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherProfileMgmtSectionTeachingZone")}
        </h2>
        <LaunchCard
          cardKey="zone"
          icon={<MapPin size={18} aria-hidden />}
          title={t("teacherProfileMgmtSectionTeachingZone")}
          description={t("teacherLaunchCardZoneDesc")}
          state={zoneState}
          expandedCard={expandedCard}
          onToggle={() => toggleCard("zone")}
          t={t}
          data-testid="teacher-profile-mgmt-card-teaching-zone"
        >
          <div className="pt-3">
            {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || googleError ? null : !googleReady ? (
              <p className="text-xs text-[#6B6A65] mb-2">{t("teacherOnboardingGoogleUnavailable")}</p>
            ) : null}
            <ZoneStep
              zone={zoneState}
              busy={busy}
              zoneShowManual={zoneShowManual}
              zoneSingleLine={zoneSingleLine}
              zoneHasPrivateAddress={zoneHasPrivateAddress}
              zoneAddressLine1={zoneAddressLine1}
              zoneAddressLine2={zoneAddressLine2}
              zoneCity={zoneCity}
              zoneRegion={zoneRegion}
              zonePostalCode={zonePostalCode}
              zoneCountryCode={zoneCountryCode}
              zoneRadiusKm={zoneRadiusKm}
              zoneSavedStatus={zoneSavedStatus}
              zoneFuzzRadiusKm={zoneFuzzRadiusKm}
              savedCity={teacherRow.city ?? ""}
              savedRegion={teacherRow.region ?? ""}
              addressRef={zoneAddressRef}
              onShowManualToggle={() => setZoneShowManual((v) => !v)}
              onSingleLineChange={setZoneSingleLine}
              onLine1Change={setZoneAddressLine1}
              onLine2Change={setZoneAddressLine2}
              onCityChange={setZoneCity}
              onRegionChange={setZoneRegion}
              onPostalCodeChange={setZonePostalCode}
              onCountryCodeChange={setZoneCountryCode}
              onRadiusChange={setZoneRadiusKm}
              onSubmit={() => void submitZone()}
              t={t}
            />
          </div>
        </LaunchCard>
      </section>

      <section data-testid="teacher-profile-mgmt-section-trust" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherProfileMgmtSectionTrust")}
        </h2>
        <LaunchCard
          cardKey="trust"
          icon={<ShieldCheck size={18} aria-hidden />}
          title={t("teacherProfileMgmtSectionTrust")}
          description={t("teacherProfileMgmtTrustDesc")}
          state={trustState}
          expandedCard={expandedCard}
          onToggle={() => toggleCard("trust")}
          t={t}
          data-testid="teacher-profile-mgmt-card-trust"
        >
          <div className="pt-3 space-y-6">
            <div>
              <p className="text-sm font-bold text-[#2C2C2A]">{t("teacherLaunchCardIdentityTitle")}</p>
              <p className="text-xs text-[#6B6A65] mt-1">{t("teacherLaunchCardIdentityDesc")}</p>
              <div className="mt-3">
                <IdentityVerificationCard
                  status={stripeStatus ?? "not_started"}
                  failedReason={teacherRow.stripe_identity_failed_reason}
                  onFallback={() => sendEmailRequest("identity")}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-[#2C2C2A]">
                {t("teacherLaunchCardDiplomaTitle")}{" "}
                <span className="text-xs font-normal text-[#6B6A65]">({t("optionalBadge")})</span>
              </p>
              <p className="text-xs text-[#6B6A65] mt-1">{t("teacherLaunchCardDiplomaDesc")}</p>
              <div className="mt-3 space-y-3">
                <DiplomaStep
                  diploma={vState.diploma}
                  busy={busy}
                  diplomaFile={diplomaFile}
                  diplomaNote={diplomaNote}
                  fileInputRef={fileInputRef}
                  onFileChange={setDiplomaFile}
                  onNoteChange={setDiplomaNote}
                  onUpload={() => void uploadDiploma()}
                  t={t}
                />
              </div>
            </div>
          </div>
        </LaunchCard>
      </section>

      <section data-testid="teacher-profile-mgmt-section-payments" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherProfileMgmtSectionPayments")}
        </h2>
        <LaunchCard
          cardKey="payments"
          icon={<CreditCard size={18} aria-hidden />}
          title={t("teacherProfileMgmtSectionPayments")}
          description={t("teacherProfileMgmtPaymentsDesc")}
          state={paymentsState}
          expandedCard={expandedCard}
          onToggle={null}
          t={t}
          data-testid="teacher-profile-mgmt-card-payments"
          ctaHref="/teacher/settings#payouts"
          ctaLabel={t("teacherProfileMgmtPaymentsCta")}
        />
      </section>
    </div>
  );
}

// ── LaunchCard primitive ────────────────────────────────────────────────────────

type LaunchCardProps = {
  cardKey: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  state: VerificationStepState;
  optional?: boolean;
  expandedCard: string | null;
  /** null means non-expandable (link-only) */
  onToggle: (() => void) | null;
  t: (k: TranslationKey) => string;
  "data-testid": string;
  ctaHref?: string;
  ctaLabel?: string;
  children?: React.ReactNode;
};

function cardStatusInfo(
  state: VerificationStepState,
  optional: boolean,
  t: (k: TranslationKey) => string,
): { label: string; tone: "complete" | "missing" | "review" | "optional" | "action" } {
  if (state.kind === "verified") return { label: t("teacherTrustStatusComplete"), tone: "complete" };
  if (state.kind === "pending") return { label: t("teacherTrustStatusInReview"), tone: "review" };
  if (state.kind === "failed") return { label: t("teacherTrustStatusActionNeeded"), tone: "action" };
  if (optional) return { label: t("teacherTrustStatusOptional"), tone: "optional" };
  return { label: t("teacherTrustStatusMissing"), tone: "missing" };
}

function LaunchCard({
  cardKey,
  icon,
  title,
  description,
  state,
  optional = false,
  expandedCard,
  onToggle,
  t,
  "data-testid": testid,
  ctaHref,
  ctaLabel,
  children,
}: LaunchCardProps) {
  const { label, tone } = cardStatusInfo(state, optional, t);
  const isExpanded = expandedCard === cardKey;

  const badgeClasses =
    tone === "complete"
      ? "bg-teal-500/15 text-teal-800 border-teal-500/30"
      : tone === "review"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : tone === "action"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : tone === "optional"
            ? "bg-slate-100 text-slate-600 border-slate-200"
            : "bg-white text-slate-700 border-slate-200";

  return (
    <article
      className="rounded-2xl border border-[#E8E6DF] bg-white p-5"
      data-testid={testid}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-teal-700">
          {icon}
          <h3 className="text-sm font-bold text-[#2C2C2A]">{title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              badgeClasses,
            )}
          >
            {tone === "complete" ? <CheckCircle2 size={11} /> : <CircleDashed size={11} />}
            {label}
          </span>
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className="text-[#6B6A65] hover:text-teal-700 transition-colors"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Réduire" : "Modifier"}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          ) : null}
        </div>
      </div>
      {!isExpanded ? (
        <p className="mt-2 text-xs leading-relaxed text-[#6B6A65]">{description}</p>
      ) : null}

      {isExpanded && children ? children : null}

      {!isExpanded && ctaHref && ctaLabel ? (
        <div className="mt-3">
          <Link
            href={ctaHref}
            className="inline-flex h-10 items-center rounded-full bg-teal-600 px-4 text-xs font-bold text-white hover:bg-teal-700"
            data-testid={`${testid}-cta`}
          >
            {ctaLabel}
          </Link>
        </div>
      ) : null}
    </article>
  );
}
