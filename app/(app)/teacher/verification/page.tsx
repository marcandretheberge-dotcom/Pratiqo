"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { getSupabaseClient } from "../../../../lib/supabase";
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

type TeacherVerifyRow = {
  id: string;
  verification_level: number | null;
  identity_verified: boolean | null;
  diploma_verified: boolean | null;
  phone_verified: boolean | null;
  is_verified: boolean | null;
};

export default function TeacherVerificationPage() {
  const { user, profile, loading } = useAuth();
  const { t } = useLocale();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [diplomaNote, setDiplomaNote] = useState("");
  const [teacherRow, setTeacherRow] = useState<TeacherVerifyRow | null>(null);
  const [plan, setPlan] = useState<string>("free");

  const load = useCallback(async () => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase
        .from("teachers")
        .select("id, verification_level, identity_verified, diploma_verified, phone_verified, is_verified")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
    ]);
    setTeacherRow(t as TeacherVerifyRow | null);
    setPlan(String((p as { plan?: string } | null)?.plan || "free"));
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const postRequest = async (kind: "identity" | "diploma", description?: string) => {
    if (!user) return;
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
      setMessage(kind === "identity" ? t("verificationSentIdentity") : t("verificationSentDiploma"));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("verificationErrorGeneric"));
    } finally {
      setBusy(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#6B6A65]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  if (profile?.role !== "teacher") {
    return (
      <div className="rounded-2xl border border-[#E8E6DF] bg-white p-8 text-center">
        <p className="text-[#2C2C2A] font-semibold">{t("verificationTeachersOnly")}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-[#1D9E75] hover:underline">
          {t("back")}
        </Link>
      </div>
    );
  }

  if (!teacherRow) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-[#633806]">{t("verificationNoTeacherRow")}</div>
    );
  }

  const planNorm = plan.toLowerCase();
  const isPro = planNorm === "pro" || planNorm === "enterprise";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">{t("verificationTrustLabel")}</p>
          <h1 className="mt-1 text-2xl font-bold text-[#2C2C2A] flex items-center gap-2">
            <ShieldCheck className="text-[#1D9E75]" size={28} />
            {t("verificationTitle")}
          </h1>
          <p className="mt-2 text-sm text-[#6B6A65] max-w-xl">{t("verificationSubtitle")}</p>
        </div>
        <VerificationBadge level={level} size="md" />
      </div>

      <VerificationBadge level={level} size="lg" />

      {message ? (
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-medium",
            message === t("verificationSentIdentity") || message === t("verificationSentDiploma")
              ? "bg-[#E1F5EE] text-[#085041] border border-[#1D9E75]/25"
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

        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <CheckCircle2 className="text-[#1D9E75] shrink-0 mt-0.5" size={22} />
            <div>
              <p className="font-semibold text-[#2C2C2A]">{t("verificationLevel1Title")}</p>
              <p className="text-sm text-[#6B6A65]">{t("verificationLevel1Body")}</p>
            </div>
          </div>
          {level >= 1 ? <span className="text-xs font-bold text-[#1D9E75]">{t("verificationOk")}</span> : null}
        </div>

        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 space-y-3">
          <div className="flex gap-3">
            <ShieldCheck className="text-[#BA7517] shrink-0 mt-0.5" size={22} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#2C2C2A]">{t("verificationLevel2Title")}</p>
              <p className="text-sm text-[#6B6A65] mt-1">{t("verificationLevel2Body")}</p>
              {teacherRow.identity_verified ? (
                <p className="mt-2 text-sm font-semibold text-[#1D9E75]">{t("verificationIdentityValidated")}</p>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void postRequest("identity")}
                  className="mt-3 h-11 rounded-xl bg-[#2C2C2A] px-5 text-sm font-semibold text-white hover:bg-[#1a1a18] disabled:opacity-50"
                >
                  {busy === "identity" ? t("verificationSending") : t("verificationUploadId")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 space-y-3">
          <div className="flex gap-3">
            <ShieldCheck className="text-[#534AB7] shrink-0 mt-0.5" size={22} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#2C2C2A]">{t("verificationLevel3Title")}</p>
              <p className="text-sm text-[#6B6A65] mt-1">{t("verificationLevel3Body")}</p>
              {teacherRow.diploma_verified ? (
                <p className="mt-2 text-sm font-semibold text-[#1D9E75]">{t("verificationDiplomaValidated")}</p>
              ) : (
                <>
                  <textarea
                    value={diplomaNote}
                    onChange={(e) => setDiplomaNote(e.target.value)}
                    placeholder={t("verificationDiplomaPlaceholder")}
                    rows={3}
                    className="mt-3 w-full rounded-xl border border-[#E8E6DF] px-3 py-2 text-sm outline-none focus:border-[#1D9E75]"
                  />
                  <button
                    type="button"
                    disabled={busy !== null || !diplomaNote.trim()}
                    onClick={() => void postRequest("diploma", diplomaNote.trim())}
                    className="mt-2 h-11 rounded-xl bg-[#534AB7] px-5 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50"
                  >
                    {busy === "diploma" ? t("verificationSending") : t("verificationRequest")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E6DF] bg-[#F1EFE8] p-5">
          <p className="font-semibold text-[#2C2C2A]">{t("verificationLevel4Title")}</p>
          <p className="mt-2 text-sm text-[#6B6A65]">
            {isPro ? t("verificationLevel4BodyPro") : t("verificationLevel4BodyFree")}
          </p>
          {!isPro ? (
            <Link
              href="/upgrade"
              className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#0F6E56] px-4 text-sm font-bold text-white hover:brightness-105"
            >
              {t("verificationViewPlans")}
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
