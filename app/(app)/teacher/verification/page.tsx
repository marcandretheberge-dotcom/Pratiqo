"use client";

/**
 * Unified Teacher Launch Center (/teacher/verification)
 * -------------------------------------------------------
 * One page where the teacher sees what is needed to start receiving requests,
 * what improves trust, and what can be completed later.
 *
 * Section 1 — Essentiel pour recevoir des demandes
 *   Profile public, Tarif, Disponibilités, Zone d'enseignement
 *
 * Section 2 — Confiance et sécurité
 *   Identité vérifiée, Diplôme ou certificat (optional), Paiements Pratiqo
 *
 * Cards expand inline. No old "Niveau 1..5" headings. No anchor-jump CTAs.
 * The Zone card wires up Google Places autocomplete using the same flow as
 * /onboarding/teacher. All existing upload/geocode/Stripe logic is preserved.
 */

import { useCallback, useEffect, useRef, useState } from "react";
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
  FileBadge,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { IdentityVerificationCard } from "../../../../components/IdentityVerificationCard";
import { useLocale } from "../../../../lib/locale-context";
import { cn } from "../../../../lib/utils";
import { deriveVerificationState, type VerificationStepState } from "../../../../lib/verificationState";
import type { TranslationKey } from "../../../../lib/translations";
import { DiplomaStep } from "./components/DiplomaStep";
import { ZoneStep } from "./components/ZoneStep";
import { ProfileAiAssistant } from "../../../../components/teacher/ProfileAiAssistant";
import { parseGooglePlace } from "../../../../lib/googleAddressParser";
import { MIN_LESSON_PRICE_DOLLARS } from "../../../../lib/pricing/constants";

type TeacherVerifyRow = {
  id: string;
  name?: string | null;
  discipline?: string | null;
  bio?: string | null;
  price_per_lesson?: number | null;
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

export default function TeacherLaunchCenterPage() {
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
  const [editDiscipline, setEditDiscipline] = useState("");
  const [profileAiOpen, setProfileAiOpen] = useState(false);
  const [profileAiNotes, setProfileAiNotes] = useState("");

  // Pricing inline editing
  const [editPrice, setEditPrice] = useState("");

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
          "id, name, discipline, bio, price_per_lesson, availability, verification_level, identity_verified, identity_status, stripe_identity_status, stripe_identity_failed_reason, diploma_verified, diploma_url, phone_verified, is_verified, location_verification_status, cv_summary, cv_verification_status, city, region, country_code, home_lesson_radius_km, home_lesson_enabled, location, stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
    ]);
    setTeacherRow(tr as TeacherVerifyRow | null);
    setPlan(String((p as { plan?: string } | null)?.plan || "free"));
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Pre-populate forms from loaded teacher data
  useEffect(() => {
    if (!teacherRow) return;
    setEditName(teacherRow.name ?? "");
    setEditBio(teacherRow.bio ?? "");
    setEditDiscipline(teacherRow.discipline ?? "");
    setEditPrice(teacherRow.price_per_lesson != null ? String(teacherRow.price_per_lesson) : "");

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
    setBusy("profile");
    setMessage(null);
    try {
      const supabase = getSupabaseClient();
      const { error: err } = await supabase
        .from("teachers")
        .update({
          name: editName.trim() || null,
          bio: editBio.trim() || null,
          discipline: editDiscipline.trim() || null,
        })
        .eq("id", teacherRow.id);
      if (err) throw err;
      showMsg(t("savedOk"), "ok");
      setExpandedCard(null);
      await load();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : t("anErrorOccurred"), "error");
    } finally {
      setBusy(null);
    }
  };

  // ── Pricing save ────────────────────────────────────────────────────────────
  const savePricing = async () => {
    if (!user?.id) return;
    const priceNum = Number(editPrice);
    if (!Number.isFinite(priceNum) || priceNum < MIN_LESSON_PRICE_DOLLARS) {
      showMsg(t("pricingMinLessonPrice"), "error");
      return;
    }
    setBusy("pricing");
    setMessage(null);
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error(t("verificationSessionExpired"));
      const res = await fetch("/api/teacher/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ price_per_lesson: priceNum }),
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
    (teacherRow.bio?.trim() ?? "") && (teacherRow.discipline?.trim() ?? "")
      ? { kind: "verified" }
      : { kind: "not_started" };

  const pricingState: VerificationStepState =
    (teacherRow.price_per_lesson ?? 0) > 0 ? { kind: "verified" } : { kind: "not_started" };

  const availabilityState: VerificationStepState =
    (teacherRow.availability?.length ?? 0) > 0 ? { kind: "verified" } : { kind: "not_started" };

  const toggleCard = (key: string) => {
    setExpandedCard((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-8">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherLaunchHeroEyebrow")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A] flex items-center gap-2">
          <Sparkles className="text-teal-700" size={26} />
          {t("teacherLaunchCenterTitle")}
        </h1>
        <p className="mt-2 text-sm text-[#6B6A65] max-w-xl">
          {t("teacherLaunchCenterSubtitle")}
        </p>
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

      {/* ── Section 1: Essentiel ─────────────────────────────────────────────── */}
      <section data-testid="teacher-launch-section-essential" className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherLaunchSectionEssential")}
        </h2>

        {/* Profile card */}
        <LaunchCard
          cardKey="profile"
          icon={<User size={18} aria-hidden />}
          title={t("teacherLaunchCardProfileTitle")}
          description={t("teacherLaunchCardProfileDesc")}
          state={profileState}
          expandedCard={expandedCard}
          onToggle={() => toggleCard("profile")}
          t={t}
          data-testid="teacher-launch-card-profile"
        >
          <div className="space-y-4 pt-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
                {t("teacherLaunchNameLabel")}
              </span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-2 w-full h-11 rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none focus:border-teal-500"
                placeholder="Ex. Marie Dupont"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
                {t("teacherLaunchDisciplineLabel")}
              </span>
              <input
                value={editDiscipline}
                onChange={(e) => setEditDiscipline(e.target.value)}
                className="mt-2 w-full h-11 rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none focus:border-teal-500"
                placeholder="Ex. Piano, Anglais, Mathématiques…"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
                {t("teacherLaunchBioLabel")}
              </span>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-[#E8E6DF] px-3 py-2 text-sm outline-none focus:border-teal-500"
                placeholder="Quelques lignes sur votre approche, votre expérience, et votre style d'enseignement…"
              />
            </label>
            <div>
              <button
                type="button"
                onClick={() => setProfileAiOpen((v) => !v)}
                className="text-xs font-semibold text-teal-700 hover:underline"
                data-testid="teacher-launch-profile-ai-toggle"
              >
                {profileAiOpen ? "▾ " : "✨ "}
                {t("aiAssistantHeadline")}
              </button>
              {profileAiOpen ? (
                <div className="mt-2">
                  <ProfileAiAssistant
                    discipline={editDiscipline || "Enseignement"}
                    specialty={editDiscipline}
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
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={busy === "profile"}
              className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {busy === "profile" ? <Loader2 size={16} className="animate-spin" /> : null}
              {t("teacherLaunchCardProfileSaveBtn")}
            </button>
            <p className="text-[11px] text-[#6B6A65]">
              <Link href="/teacher/settings" className="underline hover:text-teal-700">
                {t("teacherLaunchCardProfileDesc")}
              </Link>
            </p>
          </div>
        </LaunchCard>

        {/* Pricing card */}
        <LaunchCard
          cardKey="pricing"
          icon={<BookOpen size={18} aria-hidden />}
          title={t("teacherLaunchCardPricingTitle")}
          description={t("teacherLaunchCardPricingDesc")}
          state={pricingState}
          expandedCard={expandedCard}
          onToggle={() => toggleCard("pricing")}
          t={t}
          data-testid="teacher-launch-card-pricing"
        >
          <div className="space-y-3 pt-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
                {t("teacherLaunchPriceLabel")}
              </span>
              <input
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                type="number"
                min={MIN_LESSON_PRICE_DOLLARS}
                step="0.5"
                className="mt-2 w-full h-11 rounded-xl border border-[#E8E6DF] px-3 text-sm outline-none focus:border-teal-500"
                placeholder="50"
              />
              <p className="mt-1 text-xs text-[#6B6A65]">{t("pricingMinLessonPrice")}</p>
            </label>
            <button
              type="button"
              onClick={() => void savePricing()}
              disabled={busy === "pricing"}
              className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {busy === "pricing" ? <Loader2 size={16} className="animate-spin" /> : null}
              {t("teacherLaunchCardPricingSaveBtn")}
            </button>
          </div>
        </LaunchCard>

        {/* Availability card — links to schedule editor */}
        <LaunchCard
          cardKey="availability"
          icon={<Calendar size={18} aria-hidden />}
          title={t("teacherLaunchCardAvailabilityTitle")}
          description={t("teacherLaunchCardAvailabilityDesc")}
          state={availabilityState}
          expandedCard={expandedCard}
          onToggle={null}
          t={t}
          data-testid="teacher-launch-card-availability"
          ctaHref="/teacher/schedule"
          ctaLabel={t("teacherLaunchCardAvailabilityCta")}
        />

        {/* Zone card */}
        <LaunchCard
          cardKey="zone"
          icon={<MapPin size={18} aria-hidden />}
          title={t("teacherLaunchCardZoneTitle")}
          description={t("teacherLaunchCardZoneDesc")}
          state={vState.zone}
          expandedCard={expandedCard}
          onToggle={() => toggleCard("zone")}
          t={t}
          data-testid="teacher-launch-card-zone"
        >
          <div className="pt-3">
            {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || googleError ? null : !googleReady ? (
              <p className="text-xs text-[#6B6A65] mb-2">{t("teacherOnboardingGoogleUnavailable")}</p>
            ) : null}
            <ZoneStep
              zone={vState.zone}
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

      <hr className="border-[#E8E6DF]" />

      {/* ── Section 2: Confiance et sécurité ────────────────────────────────── */}
      <section data-testid="teacher-launch-section-trust" className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherLaunchSectionTrust")}
        </h2>

        {/* Identity card */}
        <LaunchCard
          cardKey="identity"
          icon={<ShieldCheck size={18} aria-hidden />}
          title={t("teacherLaunchCardIdentityTitle")}
          description={t("teacherLaunchCardIdentityDesc")}
          state={vState.identity}
          expandedCard={expandedCard}
          onToggle={vState.identity.kind !== "verified" ? () => toggleCard("identity") : null}
          t={t}
          data-testid="teacher-launch-card-identity"
        >
          <div className="pt-3">
            <IdentityVerificationCard
              status={stripeStatus ?? "not_started"}
              failedReason={teacherRow.stripe_identity_failed_reason}
              onFallback={() => sendEmailRequest("identity")}
            />
          </div>
        </LaunchCard>

        {/* Diploma card — optional */}
        <LaunchCard
          cardKey="diploma"
          icon={<FileBadge size={18} aria-hidden />}
          title={t("teacherLaunchCardDiplomaTitle")}
          description={t("teacherLaunchCardDiplomaDesc")}
          state={vState.diploma}
          optional
          expandedCard={expandedCard}
          onToggle={() => toggleCard("diploma")}
          t={t}
          data-testid="teacher-launch-card-diploma"
        >
          <div className="pt-3 space-y-3">
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
            <p className="text-xs text-[#6B6A65]" data-testid="teacher-launch-diploma-optional">
              {t("teacherLaunchCardDiplomaDesc")}
            </p>
          </div>
        </LaunchCard>

        {/* Payments card — links to settings */}
        <LaunchCard
          cardKey="payments"
          icon={<CreditCard size={18} aria-hidden />}
          title={t("teacherLaunchCardPaymentsTitle")}
          description={t("teacherLaunchCardPaymentsDesc")}
          state={paymentsState}
          expandedCard={expandedCard}
          onToggle={null}
          t={t}
          data-testid="teacher-launch-card-payments"
          ctaHref="/teacher/settings#payouts"
          ctaLabel={t("teacherLaunchCardPaymentsCta")}
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

      {!isExpanded && !onToggle && ctaHref && ctaLabel && state.kind !== "verified" ? (
        <div className="mt-3">
          <Link
            href={ctaHref}
            className="inline-flex h-10 items-center rounded-full bg-teal-600 px-4 text-xs font-bold text-white hover:bg-teal-700"
          >
            {ctaLabel}
          </Link>
        </div>
      ) : null}
    </article>
  );
}
