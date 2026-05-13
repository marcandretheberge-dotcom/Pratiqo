"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPinned,
  Paperclip,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
import { IdentityVerificationCard } from "../../../../components/IdentityVerificationCard";
import { VerificationBadge } from "../../../../components/VerificationBadge";
import {
  getVerificationLevel,
  nextLevelRequirementKeys,
  nextVerificationLevel,
  verificationLevelTitleKey,
  type VerificationLevel,
} from "../../../../lib/verification";
import { useLocale } from "../../../../lib/locale-context";
import { cn } from "../../../../lib/utils";
import { buildTeacherTrustBadges, buildTeacherTrustItems, type TeacherCredential } from "../../../../lib/teacherTrust";
import { deriveVerificationState } from "../../../../lib/verificationState";
import type { TranslationKey } from "../../../../lib/translations";

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

function statusLabelKey(status: TeacherCredentialRow["verification_status"]): TranslationKey {
  if (status === "verified") return "credentialStatusVerified";
  if (status === "needs_review") return "credentialStatusNeedsReview";
  if (status === "rejected") return "credentialStatusRejected";
  if (status === "expired") return "credentialStatusExpired";
  return "credentialStatusPending";
}

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
  const [diplomaProgress, setDiplomaProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    const [{ data: tr }, { data: p }] = await Promise.all([
      supabase
        .from("teachers")
        .select(
          "id, verification_level, identity_verified, identity_status, stripe_identity_status, stripe_identity_failed_reason, diploma_verified, diploma_url, phone_verified, is_verified, location_verification_status, cv_summary, cv_verification_status, bio, city, region, country_code, home_lesson_radius_km, location",
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

  // Show success banner if Stripe Identity redirected back here
  useEffect(() => {
    if (searchParams.get("identity") === "completed") {
      showMsg(
        t("stripeIdSubmitted"),
        "ok",
      );
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMsg = (text: string, kind: "ok" | "error" = "ok") => {
    setMessage(text);
    setMessageKind(kind);
  };

  const level = useMemo((): VerificationLevel => {
    if (!teacherRow) return 1;
    return getVerificationLevel({
      plan,
      identity_verified: Boolean(teacherRow.identity_verified),
      diploma_verified: Boolean(teacherRow.diploma_verified),
      is_verified: teacherRow.is_verified !== false,
      verification_level: teacherRow.verification_level,
    });
  }, [teacherRow, plan]);

  const next = nextVerificationLevel(level);
  const nextReqKeys = next
    ? nextLevelRequirementKeys(level, {
        plan,
        identity_verified: Boolean(teacherRow?.identity_verified),
        diploma_verified: Boolean(teacherRow?.diploma_verified),
      })
    : [];

  // ── Stripe Identity flow ─────────────────────────────────────────────────
  const startIdentityVerification = async () => {
    if (!user) return;
    setMessage(null);
    setBusy("identity");
    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error(t("verificationSessionExpired"));

      const res = await fetch("/api/stripe/identity/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string; detail?: string };

      if (!res.ok || !j.url) {
        // Fallback: Stripe Identity not enabled — send email request instead
        if (res.status === 503) {
          await sendEmailRequest("identity");
          return;
        }
        throw new Error(j.error || t("verificationCannotStart"));
      }

      // Redirect teacher to Stripe-hosted verification page
      window.location.href = j.url;
    } catch (e) {
      showMsg(e instanceof Error ? e.message : t("verificationErrorGeneric"), "error");
      setBusy(null);
    }
  };

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
    setDiplomaProgress(0);

    try {
      const { data: sess } = await getSupabaseClient().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error(t("verificationSessionExpired"));

      const form = new FormData();
      form.append("file", diplomaFile);
      if (diplomaNote.trim()) form.append("note", diplomaNote.trim());

      // Simulate progress (XHR would give real progress; fetch does not)
      const progressTimer = setInterval(
        () => setDiplomaProgress((p) => Math.min((p ?? 0) + 15, 85)),
        300,
      );

      const res = await fetch("/api/teacher/diploma", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      clearInterval(progressTimer);
      setDiplomaProgress(100);

      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || t("uploadFailed"));

      showMsg(t("diplomaUploadSuccess"), "ok");
      setDiplomaFile(null);
      setDiplomaNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load(); // refresh diploma_url state
    } catch (e) {
      showMsg(e instanceof Error ? e.message : t("verificationErrorGeneric"), "error");
    } finally {
      setBusy(null);
      setDiplomaProgress(null);
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
  const { isPro } = vState;
  // diploma_url exists ↔ diploma is pending or verified
  const hasDiplomaUploaded = vState.diploma.kind !== "not_started";

  // stripeStatus stays as raw DB value — IdentityVerificationCard expects Stripe's own enum strings
  const stripeStatus = (teacherRow.stripe_identity_status ?? null) as
    | "not_started"
    | "requires_input"
    | "processing"
    | "verified"
    | "failed"
    | "canceled"
    | null;
  // buildTeacherTrustItems owns its own trust-item logic; feed it raw fields as before
  const trustItems = buildTeacherTrustItems({
    isVerified: teacherRow.is_verified,
    identityVerified: teacherRow.identity_verified,
    identityStatus: teacherRow.identity_status,
    stripeIdentityStatus: teacherRow.stripe_identity_status,
    diplomaVerified: teacherRow.diploma_verified,
    diplomaUrl: teacherRow.diploma_url,
    locationVerificationStatus: teacherRow.location_verification_status,
    cvSummary: teacherRow.cv_summary,
    cvVerificationStatus: teacherRow.cv_verification_status,
    bio: teacherRow.bio,
  });
  const backgroundVerified = vState.background.kind === "verified";
  const backgroundProvided =
    vState.background.kind === "verified" ||
    vState.background.kind === "pending" ||
    vState.background.kind === "provided";

  const badgePreview = buildTeacherTrustBadges({
    identity: {
      identityVerified: teacherRow.identity_verified,
      identityStatus: teacherRow.identity_status,
      stripeIdentityStatus: teacherRow.stripe_identity_status,
    },
    credentials: credentials.map(
      (c): TeacherCredential => ({
        id: c.id,
        teacherId: c.teacher_id,
        type: c.type,
        title: c.title,
        institutionName: c.institution_name,
        country: c.country,
        issuedYear: c.issued_year,
        verificationStatus: c.verification_status,
        verificationMethod: (c.verification_method as TeacherCredential["verificationMethod"]) ?? null,
        confidenceLevel: (c.confidence_level as TeacherCredential["confidenceLevel"]) ?? null,
        publicLabel: c.public_label,
        verifiedAt: c.verified_at,
        expiresAt: c.expires_at,
      }),
    ),
  });

  const submitCredential = async () => {
    if (!teacherRow?.id) return;
    setMessage(null);
    setBusy("credentials");
    try {
      const title = credTitle.trim();
      if (!title) throw new Error(t("credentialTitleRequired"));
      const issuedYearNum = credIssuedYear.trim() ? Number(credIssuedYear.trim()) : null;
      if (issuedYearNum != null && (!Number.isFinite(issuedYearNum) || issuedYearNum < 1900)) {
        throw new Error(t("credentialIssuedYearInvalid"));
      }
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("teacher_credentials").insert({
        teacher_id: teacherRow.id,
        type: credType,
        title,
        institution_name: credInstitution.trim() || null,
        country: credCountry.trim() || null,
        issued_year: issuedYearNum != null ? Math.round(issuedYearNum) : null,
        verification_status: "pending",
        verification_method: credMethod,
        public_label: title,
      });
      if (error) throw error;
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

  return (
    <div className="space-y-8">
      <IdentityVerificationCard
        status={stripeStatus ?? "not_started"}
        failedReason={teacherRow.stripe_identity_failed_reason}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">{t("verificationTrustLabel")}</p>
          <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A] flex items-center gap-2">
            <ShieldCheck className="text-teal-700" size={28} />
            {t("verificationTitle")}
          </h1>
          <p className="mt-2 text-sm text-[#6B6A65] max-w-xl">{t("verificationSubtitle")}</p>
        </div>
        <VerificationBadge level={level} size="md" />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#DCEAE3] bg-white p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#2C2C2A]">
            {t("teacherVerificationTrustRequirements")}
          </h2>
          <p className="mt-2 text-sm text-[#6B6A65]">{t("trustSensitiveDocumentsHidden")}</p>
          <ul className="mt-4 space-y-2.5">
            {trustItems.map((item) => (
              <li key={item.key} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2
                  size={17}
                  className={cn(
                    "mt-0.5 shrink-0",
                    item.status === "pending"
                      ? "text-amber-600"
                      : item.status === "provided"
                        ? "text-slate-500"
                        : "text-teal-700",
                  )}
                />
                <span>
                  <span className="block font-semibold text-[#2C2C2A]">{t(item.publicLabelKey)}</span>
                  <span className="block text-xs leading-relaxed text-[#6B6A65]">{t(item.publicDescriptionKey)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[#E8E6DF] bg-[#F8F7F2] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#2C2C2A]">
            {t("teacherVerificationMarketplaceBenefits")}
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-[#6B6A65]">
            <li className="flex gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-700" />
              <span>{t("verificationBenefitHomeLessons")}</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-700" />
              <span>{t("verificationBenefitPublicClarity")}</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-700" />
              <span>{t("verificationBenefitProSeparated")}</span>
            </li>
          </ul>
        </div>
      </section>

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

      {next ? (
        <section className="rounded-2xl border border-[#E8E6DF] bg-white p-6 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#2C2C2A]">{t("verificationNextLevel")}</h2>
          <p className="text-lg font-semibold text-[#2C2C2A]">{t(verificationLevelTitleKey(next))}</p>
          <ul className="list-disc pl-5 text-sm text-[#6B6A65] space-y-1">
            {nextReqKeys.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#2C2C2A]">{t("verificationChecklistTitle")}</h2>

        {/* ── Level 1 — Email ────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <CheckCircle2 className="text-teal-700 shrink-0 mt-0.5" size={22} />
            <div>
              <p className="font-semibold text-[#2C2C2A]">{t("verificationLevel1Title")}</p>
              <p className="text-sm text-[#6B6A65]">{t("verificationLevel1Body")}</p>
            </div>
          </div>
          {level >= 1 ? <span className="text-xs font-bold text-teal-700">{t("verificationOk")}</span> : null}
        </div>

        {/* ── Level 2 — Identity (Stripe) ────────────────────────────────── */}
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 space-y-3">
          <div className="flex gap-3">
            <ShieldCheck className="text-[#BA7517] shrink-0 mt-0.5" size={22} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#2C2C2A]">{t("verificationLevel2Title")}</p>
              <p className="text-sm text-[#6B6A65] mt-1">{t("verificationLevel2Body")}</p>

              {vState.identity.kind === "verified" ? (
                <p className="mt-2 text-sm font-semibold text-teal-700">{t("verificationIdentityValidated")}</p>
              ) : vState.identity.kind === "pending" ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
                  <Loader2 size={16} className="animate-spin text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800 font-medium">
                    {t("verifyIdPending")}
                  </p>
                </div>
              ) : vState.identity.kind === "failed" ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-semibold text-rose-600">
                    {t("verificationFailed")}
                  </p>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void startIdentityVerification()}
                    className="h-11 rounded-xl bg-[#2C2C2A] px-5 text-sm font-semibold text-white hover:bg-[#1a1a18] disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {busy === "identity" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ExternalLink size={16} />
                    )}
                    {t("retryVerification")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void startIdentityVerification()}
                  className="mt-3 h-11 rounded-xl bg-[#2C2C2A] px-5 text-sm font-semibold text-white hover:bg-[#1a1a18] disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {busy === "identity" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ExternalLink size={16} />
                  )}
                  {t("verificationUploadId")}
                </button>
              )}

              <p className="mt-2 text-[11px] text-[#6B6A65]">
                {t("poweredByStripe")}
              </p>
            </div>
          </div>
        </div>

        {/* ── Level 3 — Diploma ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 space-y-3">
          <div className="flex gap-3">
            <ShieldCheck className="text-[#534AB7] shrink-0 mt-0.5" size={22} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#2C2C2A]">{t("verificationLevel3Title")}</p>
              <p className="text-sm text-[#6B6A65] mt-1">{t("verificationLevel3Body")}</p>

              {vState.diploma.kind === "verified" ? (
                <p className="mt-2 text-sm font-semibold text-teal-700">{t("verificationDiplomaValidated")}</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {hasDiplomaUploaded ? (
                    <div className="flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-500/25 px-4 py-2.5">
                      <CheckCircle2 size={16} className="text-teal-700 shrink-0" />
                      <p className="text-sm text-teal-800 font-medium">
                        {t("diplomaReceived")}
                      </p>
                    </div>
                  ) : null}

                  {/* File picker */}
                  <div>
                    <label
                      htmlFor="diploma-file"
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors",
                        diplomaFile
                          ? "border-teal-500 bg-teal-500/10"
                          : "border-[#E8E6DF] hover:border-teal-500/50 hover:bg-slate-50",
                      )}
                    >
                      {diplomaFile ? (
                        <>
                          <Paperclip size={22} className="text-teal-700" />
                          <span className="text-sm font-medium text-[#2C2C2A] text-center truncate max-w-xs">
                            {diplomaFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setDiplomaFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                          >
                            <X size={12} /> {t("removeFile")}
                          </button>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={24} className="text-[#6B6A65]" />
                          <span className="text-sm text-[#6B6A65] text-center">
                            <span className="font-semibold text-teal-700">{t("chooseFile")}</span>{" "}
                            {t("orDropFile")}
                          </span>
                          <span className="text-[11px] text-[#6B6A65]">{t("fileTypes")}</span>
                        </>
                      )}
                    </label>
                    <input
                      id="diploma-file"
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="sr-only"
                      onChange={(e) => setDiplomaFile(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <textarea
                    value={diplomaNote}
                    onChange={(e) => setDiplomaNote(e.target.value)}
                    placeholder={t("verificationDiplomaPlaceholder")}
                    rows={2}
                    className="w-full rounded-xl border border-[#E8E6DF] px-3 py-2 text-sm outline-none focus:border-teal-500"
                  />

                  {/* Progress bar */}
                  {diplomaProgress !== null ? (
                    <div className="space-y-1">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-600 transition-all duration-300"
                          style={{ width: `${diplomaProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-[#6B6A65]">
                        {diplomaProgress < 100 ? t("uploading") : t("uploadedDone")}
                      </p>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={busy !== null || !diplomaFile}
                    onClick={() => void uploadDiploma()}
                    className="h-11 rounded-xl bg-[#534AB7] px-5 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {busy === "diploma" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <UploadCloud size={16} />
                    )}
                    {hasDiplomaUploaded ? t("replaceDiploma") : t("verificationRequest")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Level 4 — Zone d'enseignement ─────────────────────────────── */}
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 space-y-4">
          <div className="flex gap-3">
            <MapPinned className="text-teal-700 shrink-0 mt-0.5" size={22} />
            <div className="min-w-0">
              <p className="font-semibold text-[#2C2C2A]">{t("verificationLevel4Title")}</p>
              <p className="text-sm text-[#6B6A65] mt-1">{t("verificationLevel4BodyZone")}</p>
            </div>
          </div>

          {/* Privacy banner */}
          <div className="rounded-xl border border-[#DCEAE3] bg-[#F3FAF6] px-4 py-3 text-xs text-teal-800">
            Votre adresse exacte reste privée. Seule une position approximative est affichée publiquement.
          </div>

          {/* Primary address input — always visible */}
          <div className="space-y-1.5">
            <label
              htmlFor="zone-address-single"
              className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]"
            >
              Adresse privée d&apos;enseignement
            </label>
            <input
              id="zone-address-single"
              type="text"
              value={zoneSingleLine}
              onChange={(e) => setZoneSingleLine(e.target.value)}
              placeholder="Ex. : 123 rue Principale, Saint-Georges"
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
            />
            <p className="text-xs text-[#6B6A65]">
              Entrez l&apos;adresse complète. Le serveur la géocode automatiquement.
            </p>
          </div>

          {/* Manual fields toggle */}
          <button
            type="button"
            onClick={() => setZoneShowManual((v) => !v)}
            className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
          >
            {zoneShowManual ? "▲ Masquer les champs manuels" : "▼ Saisir l'adresse manuellement"}
          </button>

          {/* Manual fields panel — clearly bordered when open */}
          {zoneShowManual ? (
            <div className="rounded-xl border border-[#DCEAE3] bg-[#F8F7F2] p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
                Détails de l&apos;adresse
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-medium text-[#6B6A65]">Adresse</span>
                  <input
                    value={zoneAddressLine1}
                    onChange={(e) => setZoneAddressLine1(e.target.value)}
                    placeholder="123 Rue Principale"
                    className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-medium text-[#6B6A65]">Appartement / bureau</span>
                  <input
                    value={zoneAddressLine2}
                    onChange={(e) => setZoneAddressLine2(e.target.value)}
                    placeholder="Apt 2"
                    className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-[#6B6A65]">Ville</span>
                  <input
                    value={zoneCity}
                    onChange={(e) => setZoneCity(e.target.value)}
                    placeholder="Montréal"
                    className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-[#6B6A65]">Région / province</span>
                  <input
                    value={zoneRegion}
                    onChange={(e) => setZoneRegion(e.target.value)}
                    placeholder="Québec"
                    className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-[#6B6A65]">Code postal</span>
                  <input
                    value={zonePostalCode}
                    onChange={(e) => setZonePostalCode(e.target.value)}
                    placeholder="H2X 1Y1"
                    className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-[#6B6A65]">Pays (code)</span>
                  <input
                    value={zoneCountryCode}
                    onChange={(e) => setZoneCountryCode(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="CA"
                    maxLength={2}
                    className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {/* Radius — always visible */}
          <label className="space-y-1 block">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
              {t("zoneRadiusKmLabel")}
            </span>
            <input
              value={zoneRadiusKm}
              onChange={(e) => setZoneRadiusKm(e.target.value)}
              placeholder="10"
              inputMode="numeric"
              className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
            />
          </label>

          <button
            type="button"
            disabled={
              busy !== null ||
              (zoneShowManual
                ? !zoneCity.trim() || !zoneRegion.trim() || !zoneCountryCode.trim()
                : !zoneSingleLine.trim() && !zoneCity.trim())
            }
            onClick={() => void submitZone()}
            className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {busy === "zone" ? <Loader2 size={16} className="animate-spin" /> : <MapPinned size={16} />}
            Enregistrer et vérifier ma zone
          </button>

          {/* Public summary — only shown when a location status exists and a city is known */}
          {(zoneSavedStatus || vState.zone.kind === "verified" || vState.zone.kind === "pending") && (zoneCity || teacherRow?.city) ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Position publique approximative
              </p>
              <p className="text-sm font-semibold text-[#2C2C2A]">
                {zoneCity || teacherRow?.city}
                {(zoneRegion || teacherRow?.region) ? `, ${zoneRegion || teacherRow?.region}` : ""}
              </p>
              <p className="text-xs text-[#6B6A65]">± {zoneFuzzRadiusKm ?? 1} km</p>
              {(zoneSavedStatus === "auto_verified" || vState.zone.kind === "verified") ? (
                <p className="text-xs font-semibold text-teal-700">{t("trustZoneVerified")}</p>
              ) : (
                <p className="text-xs font-semibold text-amber-700">{t("trustZonePending")}</p>
              )}
              <p className="text-[11px] text-slate-400">Adresse exacte : privée</p>
              {zoneHasPrivateAddress ? (
                <p className="text-[11px] text-slate-400">Source : adresse enregistrée sur cette page</p>
              ) : (
                <>
                  <p className="text-[11px] text-slate-400">Source : ancienne localisation du profil</p>
                  <p className="text-[11px] text-amber-600">
                    Enregistrez votre adresse privée ci-dessus pour confirmer cette zone.
                  </p>
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* ── Credentials / qualifications (Pratiqo-reviewed) ─────────────── */}
        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 space-y-4">
          <div className="flex gap-3">
            <ShieldCheck className="text-teal-700 shrink-0 mt-0.5" size={22} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#2C2C2A]">{t("credentialsTitle")}</p>
              <p className="text-sm text-[#6B6A65] mt-1">{t("credentialsSubtitle")}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">{t("credentialType")}</span>
              <select
                value={credType}
                onChange={(e) => setCredType(e.target.value as TeacherCredentialRow["type"])}
                className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="degree">{t("credentialTypeDegree")}</option>
                <option value="certificate">{t("credentialTypeCertificate")}</option>
                <option value="license">{t("credentialTypeLicense")}</option>
                <option value="experience">{t("credentialTypeExperience")}</option>
                <option value="portfolio">{t("credentialTypePortfolio")}</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">{t("credentialMethod")}</span>
              <select
                value={credMethod}
                onChange={(e) => setCredMethod(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="mycreds">{t("credentialMethodMyCreds")}</option>
                <option value="document_review">{t("credentialMethodDocumentReview")}</option>
                <option value="institution_direct">{t("credentialMethodInstitutionDirect")}</option>
                <option value="official_registry">{t("credentialMethodOfficialRegistry")}</option>
                <option value="reference_check">{t("credentialMethodReference")}</option>
                <option value="manual">{t("credentialMethodManual")}</option>
              </select>
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">{t("credentialTitle")}</span>
            <input
              value={credTitle}
              onChange={(e) => setCredTitle(e.target.value)}
              placeholder={t("credentialTitlePlaceholder")}
              className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">{t("credentialInstitution")}</span>
              <input
                value={credInstitution}
                onChange={(e) => setCredInstitution(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">{t("credentialCountry")}</span>
              <input
                value={credCountry}
                onChange={(e) => setCredCountry(e.target.value)}
                placeholder="CA"
                className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">{t("credentialIssuedYear")}</span>
              <input
                value={credIssuedYear}
                onChange={(e) => setCredIssuedYear(e.target.value)}
                inputMode="numeric"
                placeholder="2020"
                className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void submitCredential()}
            disabled={busy !== null}
            className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {busy === "credentials" ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {t("credentialSubmit")}
          </button>

          {credentials.length ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600">{t("credentialsSubmitted")}</p>
              <ul className="mt-3 space-y-2">
                {credentials.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{c.title}</p>
                      <p className="text-xs text-slate-600">
                        {[c.institution_name, c.country, c.issued_year ? String(c.issued_year) : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold",
                      c.verification_status === "verified"
                        ? "bg-teal-50 text-teal-700"
                        : c.verification_status === "needs_review"
                          ? "bg-amber-100 text-amber-800"
                          : c.verification_status === "rejected"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-slate-100 text-slate-700",
                    )}>
                      {t(statusLabelKey(c.verification_status))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl border border-[#DCEAE3] bg-[#F3FAF6] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">{t("publicBadgePreview")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {badgePreview.length ? badgePreview.map((b) => (
                <span key={b.key} title={t(b.descriptionKey)} className="inline-flex items-center gap-1 rounded-full bg-white border border-[#DCEAE3] px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                  <CheckCircle2 size={12} aria-hidden />
                  {t(b.labelKey)}
                </span>
              )) : (
                <p className="text-sm text-slate-600">{t("publicBadgePreviewEmpty")}</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 space-y-3">
          <div className="flex gap-3">
            <BriefcaseBusiness className="text-slate-600 shrink-0 mt-0.5" size={22} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#2C2C2A]">{t("verificationLevel5Title")}</p>
              <p className="text-sm text-[#6B6A65] mt-1">{t("verificationLevel5Body")}</p>
              {backgroundVerified ? (
                <p className="mt-2 text-sm font-semibold text-teal-700">{t("trustBackgroundVerified")}</p>
              ) : backgroundProvided ? (
                <p className="mt-2 text-sm font-semibold text-slate-700">{t("trustBackgroundProvided")}</p>
              ) : (
                <p className="mt-2 text-xs text-[#6B6A65]">{t("backgroundVerificationStatus")}: {t("verificationUnverified")}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Marketplace plan benefits ─────────────────────────────────── */}
        <div className="rounded-2xl border border-[#E8E6DF] bg-[#F1EFE8] p-5">
          <p className="font-semibold text-[#2C2C2A]">{t("verificationMarketplacePlanTitle")}</p>
          <p className="mt-2 text-sm text-[#6B6A65]">
            {isPro ? t("verificationLevel4BodyPro") : t("verificationLevel4BodyFree")}
          </p>
          {!isPro ? (
            <Link
              href="/upgrade"
              className="mt-4 inline-flex h-10 items-center rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:brightness-105"
            >
              {t("verificationViewPlans")}
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
