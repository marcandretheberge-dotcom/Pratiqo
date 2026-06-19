"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { isTeacherProfileComplete } from "@/lib/teacherOnboarding";
import { buildTeacherSignupLoginHref } from "@/lib/auth/teacherOnboardingIntent";
import {
  buildOnboardingRoleChoicePath,
  needsOnboardingRoleChoice,
  resolveProfileDashboardFromAuth,
} from "@/lib/auth/onboardingRoleChoice";

const SETUP_DESTINATION = "/teacher/verification?setup=1";

export default function TeacherOnboardingPage() {
  const { user, loading, profile } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [checkingExistingProfile, setCheckingExistingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(buildTeacherSignupLoginHref());
      return;
    }
    if (
      profile?.role === "student" &&
      needsOnboardingRoleChoice({
        role: profile.role,
        companion_chosen: profile.companion_chosen,
        teacher_onboarding_complete: profile.teacher_onboarding_complete,
        dashboard: resolveProfileDashboardFromAuth(profile as Record<string, unknown>),
      })
    ) {
      router.replace(buildOnboardingRoleChoicePath(true));
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    const nextName =
      typeof profile?.name === "string" && profile.name.trim()
        ? profile.name.trim()
        : user?.user_metadata?.full_name
          ? String(user.user_metadata.full_name)
          : user?.email?.split("@")[0] ?? "";
    setDisplayName((current) => current || nextName);
  }, [profile?.name, user?.email, user?.user_metadata?.full_name]);

  useEffect(() => {
    if (!user?.id) {
      if (!loading) setCheckingExistingProfile(false);
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseClient();

    void (async () => {
      setCheckingExistingProfile(true);
      const { data: trow } = await supabase
        .from("teachers")
        .select("name, category, discipline, city, region, country_code, timezone, teaching_mode, price_per_lesson, availability")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (isTeacherProfileComplete(trow ?? null)) {
        router.replace("/dashboard");
        return;
      }

      if (profile?.teacher_onboarding_complete === true && trow) {
        router.replace(SETUP_DESTINATION);
        return;
      }

      setCheckingExistingProfile(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, profile?.teacher_onboarding_complete, router, user?.id]);

  const canSubmit = useMemo(
    () => displayName.trim().length >= 2 && consentAccepted && !saving && !checkingExistingProfile,
    [checkingExistingProfile, consentAccepted, displayName, saving],
  );

  const submit = async () => {
    if (!user?.id) return;
    const name = displayName.trim();
    if (name.length < 2) {
      setError(t("teacherMinimalSetupNameRequired"));
      return;
    }
    if (!consentAccepted) {
      setError(t("teacherMinimalSetupConsentRequired"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error(t("anErrorOccurred"));

      const completeRes = await fetch("/api/teacher/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name,
          tax_status_acknowledged: true,
          no_exclusivity_acknowledged: true,
          no_income_guarantee_acknowledged: true,
        }),
      });
      const completePayload = (await completeRes.json().catch(() => ({}))) as { error?: string };
      if (!completeRes.ok) {
        const code = completePayload.error;
        if (
          code === "teacher_display_name_required" ||
          code === "teacher_minimal_setup_consent_required"
        ) {
          throw new Error(t("teacherMinimalSetupRequired"));
        }
        if (
          code === "teacher_profile_ensure_failed" ||
          code === "teacher_onboarding_profile_repair_failed" ||
          code === "teacher_onboarding_update_failed" ||
          code === "teacher_profile_completion_failed" ||
          code === "teacher_onboarding_profile_load_failed" ||
          code === "teacher_onboarding_unexpected_error"
        ) {
          throw new Error(t("verificationNoTeacherRowSetup"));
        }
        throw new Error(code || t("anErrorOccurred"));
      }

      router.replace(SETUP_DESTINATION);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("anErrorOccurred"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || checkingExistingProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[#6B6A65]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-10 sm:px-6">
      <div
        className="w-full overflow-hidden rounded-3xl border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_18px_55px_rgba(0,0,0,0.08)]"
        data-testid="teacher-minimal-onboarding"
      >
        <div className="border-b border-[rgba(0,0,0,0.06)] bg-[#F3FAF6] px-6 py-5 sm:px-8">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-700/80">
            <ShieldCheck size={16} aria-hidden />
            {t("teacherMinimalSetupEyebrow")}
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[var(--p-text)] sm:text-3xl">
            {t("teacherMinimalSetupTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--p-text-muted)]">
            {t("teacherMinimalSetupSubtitle")}
          </p>
        </div>

        <div className="space-y-6 px-6 py-6 sm:px-8">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <label className="block">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--p-text-subtle)]">
              <UserRound size={15} aria-hidden />
              {t("teacherMinimalSetupDisplayName")}
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-[var(--p-border-light)] px-4 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              data-testid="teacher-minimal-display-name"
              autoComplete="name"
            />
          </label>

          <label className="flex gap-3 rounded-2xl border border-teal-500/20 bg-teal-50/60 p-4 text-sm leading-relaxed text-teal-950">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-teal-500 text-teal-700 focus:ring-teal-500"
              data-testid="teacher-minimal-consent"
            />
            <span>{t("teacherMinimalSetupConsent")}</span>
          </label>

          <div className="rounded-2xl border border-[#E8E6DF] bg-[#FAF8F3] p-4 text-sm text-[#56534D]">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
              <p>{t("teacherMinimalSetupNextStep")}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-700 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            data-testid="teacher-minimal-submit"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t("teacherMinimalSetupSubmit")}
          </button>
        </div>
      </div>
    </div>
  );
}
