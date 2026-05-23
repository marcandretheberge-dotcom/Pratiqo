"use client";

/**
 * Trust & Visibility (formerly /teacher/verification compliance dashboard)
 * -----------------------------------------------------------------------
 * This page used to expose "Niveau 1..5" as the primary structure, which
 * read as a bureaucratic compliance checklist. The Teacher Launch Center
 * redesign replaces that with five user-facing "unlock cards" tied to the
 * concrete student-visible thing each trust step unlocks:
 *
 *   1. Appear on the map         (needs verified teaching zone)
 *   2. Offer lessons at home     (needs identity + zone)
 *   3. Show verified identity    (needs Stripe Identity)
 *   4. Show verified diploma     (optional, helps booking confidence)
 *   5. Receive payments          (needs Stripe Connect)
 *
 * The underlying upload / form components (DiplomaStep, ZoneStep, etc.)
 * are still mounted below so each card's CTA can scroll/anchor into the
 * matching action surface — we did NOT rebuild the upload pipelines.
 *
 * Pro is intentionally NOT mixed into the unlock cards. Pro is a separate
 * business/visibility plan, not a trust signal.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CircleDashed,
  CreditCard,
  FileBadge,
  Home,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { IdentityVerificationCard } from "../../../../components/IdentityVerificationCard";
import { useLocale } from "../../../../lib/locale-context";
import { cn } from "../../../../lib/utils";
import { deriveVerificationState, type VerificationStepState } from "../../../../lib/verificationState";
import type { TranslationKey } from "../../../../lib/translations";
import { DiplomaStep } from "./components/DiplomaStep";
import { CredentialsStep } from "./components/CredentialsStep";
import { ZoneStep } from "./components/ZoneStep";

type TeacherVerifyRow = {
  id: string;
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
  bio?: string | null;
  // Zone fields (loaded so the form can be pre-populated)
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
  home_lesson_radius_km?: number | null;
  location?: unknown;
  // Home lessons + payments (used to derive unlock-card status only — no
  // payment behavior or Stripe writes happen on this page).
  home_lesson_enabled?: boolean | null;
  stripe_connect_onboarding_complete?: boolean | null;
  stripe_connect_charges_enabled?: boolean | null;
  stripe_connect_payouts_enabled?: boolean | null;
  stripe_account_id?: string | null;
};

type TeacherCredentialRow = {
  id: string;
  teacher_id: string;
  type: "degree" | "certificate" | "license" | "experience" | "portfolio";
  title: string;
  institution_name: string | null;
  country: string | null;
  issued_year: number | null;
  verification_status: "not_started" | "pending" | "verified" | "rejected" | "needs_review" | "expired";
  verification_method: string | null;
  confidence_level: string | null;
  public_label: string | null;
  verified_at: string | null;
  expires_at: string | null;
  created_at: string | null;
};

export default function TeacherVerificationPage() {
  const { user, profile, loading } = useAuth();
  const { t } = useLocale();
  const searchParams = useSearchParams();

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"ok" | "error">("ok");
  const [teacherRow, setTeacherRow] = useState<TeacherVerifyRow | null>(null);
  const [plan, setPlan] = useState<string>("free");
  const [credentials, setCredentials] = useState<TeacherCredentialRow[]>([]);

  const [credType, setCredType] = useState<TeacherCredentialRow["type"]>("degree");
  const [credTitle, setCredTitle] = useState("");
  const [credInstitution, setCredInstitution] = useState("");
  const [credCountry, setCredCountry] = useState("");
  const [credIssuedYear, setCredIssuedYear] = useState("");
  const [credMethod, setCredMethod] = useState<string>("document_review");

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
  // Public summary shown after save
  const [zoneSavedStatus, setZoneSavedStatus] = useState<string | null>(null);
  const [zoneFuzzRadiusKm, setZoneFuzzRadiusKm] = useState<number | null>(null);

  // Diploma file state
  const [diplomaFile, setDiplomaFile] = useState<File | null>(null);
  const [diplomaNote, setDiplomaNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const redirectHandledRef = useRef(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    const [{ data: tr }, { data: p }] = await Promise.all([
      supabase
        .from("teachers")
        .select(
          // Teacher reads their own row — RLS allows it. We include
          // stripe_connect_* + home_lesson_enabled so the unlock cards can
          // display real status. None of these are written from this page.
          "id, verification_level, identity_verified, identity_status, stripe_identity_status, stripe_identity_failed_reason, diploma_verified, diploma_url, phone_verified, is_verified, location_verification_status, cv_summary, cv_verification_status, bio, city, region, country_code, home_lesson_radius_km, home_lesson_enabled, location, stripe_account_id, stripe_connect_onboarding_complete, stripe_connect_charges_enabled, stripe_connect_payouts_enabled",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
    ]);
    setTeacherRow(tr as TeacherVerifyRow | null);
    setPlan(String((p as { plan?: string } | null)?.plan || "free"));

    const teacherId = (tr as { id?: string } | null)?.id;
    if (teacherId) {
      const { data: creds } = await supabase
        .from("teacher_credentials")
        .select("id, teacher_id, type, title, institution_name, country, issued_year, verification_status, verification_method, confidence_level, public_label, verified_at, expires_at, created_at")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });
      setCredentials((creds ?? []) as TeacherCredentialRow[]);
    } else {
      setCredentials([]);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Pre-populate zone form whenever teacher data loads
  useEffect(() => {
    if (!teacherRow) return;
    setZoneCity(teacherRow.city ?? "");
    setZoneRegion(teacherRow.region ?? "");
    setZoneCountryCode(teacherRow.country_code ?? "");
    setZoneRadiusKm(teacherRow.home_lesson_radius_km != null ? String(teacherRow.home_lesson_radius_km) : "");
    // Read private address from location.private (teacher owns this data — display back to them)
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
    // Restore saved public summary state
    if (teacherRow.location_verification_status) {
      setZoneSavedStatus(teacherRow.location_verification_status);
    }
    if (typeof loc.fuzz_radius_km === "number") {
      setZoneFuzzRadiusKm(loc.fuzz_radius_km);
    }
  }, [teacherRow]);

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
      await load();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : t("verificationErrorGeneric"), "error");
    } finally {
      setBusy(null);
    }
  };

  const showMsg = useCallback((text: string, kind: "ok" | "error" = "ok") => {
    setMessage(text);
    setMessageKind(kind);
  }, []);

  // Show success banner if Stripe Identity redirected back here
  useEffect(() => {
    if (redirectHandledRef.current) return;
    redirectHandledRef.current = true;
    if (searchParams.get("identity") !== "completed") return;
    showMsg(t("stripeIdSubmitted"), "ok");
    void load();
  }, [searchParams, showMsg, load, t]);

  // Fallback email-based request (used when Stripe Identity is unavailable)
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

  // ── Diploma file upload ──────────────────────────────────────────────────
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
      await load();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : t("verificationErrorGeneric"), "error");
    } finally {
      setBusy(null);
    }
  };

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

  // stripeStatus stays as raw DB value — IdentityVerificationCard expects Stripe's own enum strings
  const stripeStatus = (teacherRow.stripe_identity_status ?? null) as
    | "not_started"
    | "requires_input"
    | "processing"
    | "verified"
    | "failed"
    | "canceled"
    | null;

  // Derived payments unlock — read-only summary used by the "Receive payments" card.
  // We do NOT mutate Stripe/payment data on this page; the CTA simply links to
  // the existing /api/stripe/connect flow used elsewhere in the app.
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

  // "Offer lessons at home" depends on the COMBINATION of identity + zone.
  // A teacher with no identity but enabled home_lesson_enabled would mislead
  // students — so we surface "Action needed" if home is on but identity isn't.
  const homeReady = vState.identity.kind === "verified" && vState.zone.kind === "verified";
  const homeState: VerificationStepState = homeReady
    ? { kind: "verified" }
    : teacherRow.home_lesson_enabled && vState.identity.kind !== "verified"
      ? { kind: "failed", reason: null }
      : vState.identity.kind === "pending" || vState.zone.kind === "pending"
        ? { kind: "pending" }
        : { kind: "not_started" };

  const submitCredential = async () => {
    setMessage(null);
    setBusy("credentials");
    try {
      const title = credTitle.trim();
      if (!title) throw new Error(t("credentialTitleRequired"));
      const issuedYearNum = credIssuedYear.trim() ? Number(credIssuedYear.trim()) : null;
      if (issuedYearNum != null && (!Number.isFinite(issuedYearNum) || issuedYearNum < 1900)) {
        throw new Error(t("credentialIssuedYearInvalid"));
      }

      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error(t("verificationSessionExpired"));

      const res = await fetch("/api/teacher/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: credType,
          title,
          institution_name: credInstitution.trim() || null,
          country: credCountry.trim() || null,
          issued_year: issuedYearNum != null ? Math.round(issuedYearNum) : null,
          verification_method: credMethod,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || t("verificationErrorGeneric"));

      showMsg(t("credentialSubmitted"), "ok");
      setCredTitle("");
      setCredInstitution("");
      setCredCountry("");
      setCredIssuedYear("");
      setCredMethod("document_review");
      await load();
    } catch (e) {
      showMsg(e instanceof Error ? e.message : t("verificationErrorGeneric"), "error");
    } finally {
      setBusy(null);
    }
  };

  // Five unlock cards — one per concrete student-visible thing.
  // Order is intentional: marketplace visibility first, then identity/diploma,
  // then payments. Diploma is explicitly Optional.
  const unlockCards: UnlockCardSpec[] = [
    {
      key: "map",
      icon: <MapPin size={18} aria-hidden />,
      titleKey: "teacherTrustCardMapTitle",
      descKey: "teacherTrustCardMapDescription",
      ctaKey: "teacherTrustCardMapCta",
      state: vState.zone,
      anchor: "trust-zone",
    },
    {
      key: "home",
      icon: <Home size={18} aria-hidden />,
      titleKey: "teacherTrustCardHomeTitle",
      descKey: "teacherTrustCardHomeDescription",
      ctaKey: "teacherTrustCardHomeCta",
      state: homeState,
      anchor: "trust-zone",
    },
    {
      key: "identity",
      icon: <ShieldCheck size={18} aria-hidden />,
      titleKey: "teacherTrustCardIdentityTitle",
      descKey: "teacherTrustCardIdentityDescription",
      ctaKey: "teacherTrustCardIdentityCta",
      state: vState.identity,
      anchor: "trust-identity",
    },
    {
      key: "diploma",
      icon: <FileBadge size={18} aria-hidden />,
      titleKey: "teacherTrustCardDiplomaTitle",
      descKey: "teacherTrustCardDiplomaDescription",
      ctaKey: "teacherTrustCardDiplomaCta",
      state: vState.diploma,
      anchor: "trust-diploma",
      optional: true,
    },
    {
      key: "payments",
      icon: <CreditCard size={18} aria-hidden />,
      titleKey: "teacherTrustCardPaymentsTitle",
      descKey: "teacherTrustCardPaymentsDescription",
      ctaKey: "teacherTrustCardPaymentsCta",
      state: paymentsState,
      ctaHref: "/teacher/settings#payouts",
    },
  ];

  return (
    <div className="space-y-8">
      {vState.identity.kind !== "verified" && (
        <IdentityVerificationCard
          status={stripeStatus ?? "not_started"}
          failedReason={teacherRow.stripe_identity_failed_reason}
          onFallback={() => sendEmailRequest("identity")}
        />
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherTrustVisibilitySubtitle")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A] flex items-center gap-2">
          <Sparkles className="text-teal-700" size={26} />
          {t("teacherTrustVisibilityTitle")}
        </h1>
        <p className="mt-2 text-sm text-[#6B6A65] max-w-xl">
          {t("teacherTrustVisibilityIntro")}
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

      {/* ── Five unlock cards ─────────────────────────────────────────────── */}
      <section
        className="grid gap-4 sm:grid-cols-2"
        aria-label={t("teacherTrustVisibilityTitle")}
        data-testid="teacher-trust-unlock-cards"
      >
        {unlockCards.map((card) => (
          <UnlockCard key={card.key} card={card} t={t} />
        ))}
      </section>

      <hr className="border-[#E8E6DF]" />

      {/* ── Action surfaces (forms backing each card) ─────────────────────── */}
      <section id="trust-identity" className="space-y-4 scroll-mt-24">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("teacherTrustCardIdentityTitle")}
        </h2>
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5">
          {vState.identity.kind === "verified" ? (
            <p className="text-sm font-semibold text-teal-700">
              {t("verificationIdentityValidated")}
            </p>
          ) : vState.identity.kind === "pending" ? (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
              <Loader2 size={16} className="animate-spin text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">{t("verifyIdPending")}</p>
            </div>
          ) : vState.identity.kind === "failed" ? (
            <p className="text-sm font-semibold text-rose-600">{t("verificationFailed")}</p>
          ) : (
            <p className="text-sm text-[#6B6A65]">{t("teacherTrustCardIdentityDescription")}</p>
          )}
          <p className="mt-2 text-[11px] text-[#6B6A65]">{t("poweredByStripe")}</p>
        </div>
      </section>

      <section id="trust-zone" className="scroll-mt-24">
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
      </section>

      <section id="trust-diploma" className="scroll-mt-24">
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
        <p className="mt-2 text-xs text-[#6B6A65]" data-testid="teacher-trust-diploma-optional">
          {t("teacherTrustCardDiplomaDescription")}
        </p>
      </section>

      <section className="scroll-mt-24">
        <CredentialsStep
          credentials={credentials}
          credType={credType}
          credTitle={credTitle}
          credInstitution={credInstitution}
          credCountry={credCountry}
          credIssuedYear={credIssuedYear}
          credMethod={credMethod}
          busy={busy}
          badgePreview={[]}
          onTypeChange={setCredType}
          onTitleChange={setCredTitle}
          onInstitutionChange={setCredInstitution}
          onCountryChange={setCredCountry}
          onIssuedYearChange={setCredIssuedYear}
          onMethodChange={setCredMethod}
          onSubmit={() => void submitCredential()}
          t={t}
        />
      </section>
    </div>
  );
}

// ── Unlock card primitives ──────────────────────────────────────────────────

type UnlockCardSpec = {
  key: string;
  icon: React.ReactNode;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  ctaKey: TranslationKey;
  state: VerificationStepState;
  /** Anchor inside this page to scroll to (when no `ctaHref` is set). */
  anchor?: string;
  /** External CTA href (e.g. Stripe payouts). */
  ctaHref?: string;
  optional?: boolean;
};

function statusInfo(
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

function UnlockCard({ card, t }: { card: UnlockCardSpec; t: (k: TranslationKey) => string }) {
  const { label, tone } = statusInfo(card.state, Boolean(card.optional), t);

  const toneClasses =
    tone === "complete"
      ? "bg-teal-500/15 text-teal-800 border-teal-500/30"
      : tone === "review"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : tone === "action"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : tone === "optional"
            ? "bg-slate-100 text-slate-600 border-slate-200"
            : "bg-white text-slate-700 border-slate-200";

  const isCta = tone !== "complete";
  const cta = card.ctaHref ? (
    <Link
      href={card.ctaHref}
      className="inline-flex h-10 items-center rounded-full bg-teal-600 px-4 text-xs font-bold text-white hover:bg-teal-700"
    >
      {t(card.ctaKey)}
    </Link>
  ) : (
    <a
      href={`#${card.anchor ?? ""}`}
      className="inline-flex h-10 items-center rounded-full bg-teal-600 px-4 text-xs font-bold text-white hover:bg-teal-700"
    >
      {t(card.ctaKey)}
    </a>
  );

  return (
    <article
      className="rounded-2xl border border-[#E8E6DF] bg-white p-5 flex flex-col gap-3"
      data-testid={`teacher-trust-card-${card.key}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-teal-700">
          {card.icon}
          <h3 className="text-sm font-bold text-[#2C2C2A]">{t(card.titleKey)}</h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            toneClasses,
          )}
        >
          {tone === "complete" ? <CheckCircle2 size={11} /> : <CircleDashed size={11} />}
          {label}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-[#6B6A65]">{t(card.descKey)}</p>
      {isCta ? <div>{cta}</div> : null}
    </article>
  );
}
