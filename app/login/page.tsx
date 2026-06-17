"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { cn } from "../../lib/utils";
import PratiqoLogo from "../../components/PratiqoLogo";
import { LocaleSwitcher } from "../../components/LocaleSwitcher";
import { loginWithGoogle } from "../../lib/auth";
import { resolvePostAuthRedirect, type ProfileRole } from "../../lib/auth/postAuthRedirect";
import {
  hasTeacherOnboardingIntent,
  parsePublicSignUpRoleParam,
  resolveLoginOAuthNextPath,
} from "../../lib/auth/teacherOnboardingIntent";
import { useAuth } from "../../components/AuthProvider";
import { useLocale } from "../../lib/locale-context";
import { getSupabaseClient } from "../../lib/supabase";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const roleParam = searchParams.get("role");
  const nextParam = searchParams.get("next");
  const refCode = searchParams.get("ref") ?? undefined;
  const isTeacherInvite = hasTeacherOnboardingIntent(roleParam, nextParam);
  const oauthNext = resolveLoginOAuthNextPath(roleParam, nextParam);

  useEffect(() => {
    if (loading || !user) return;

    let cancelled = false;
    void (async () => {
      const supabase = getSupabaseClient();
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("role, teacher_onboarding_complete, companion_chosen")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const profile = profileRow as {
        role?: string | null;
        teacher_onboarding_complete?: boolean | null;
        companion_chosen?: boolean | null;
      } | null;

      let effectiveRole: ProfileRole =
        profile?.role === "admin" || profile?.role === "teacher" || profile?.role === "student"
          ? profile.role
          : "student";

      if (isTeacherInvite && effectiveRole === "student") {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch("/api/onboarding/select-role", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ role: "teacher" }),
          });
          if (res.ok) {
            effectiveRole = "teacher";
          }
        }
      }

      if (cancelled) return;

      const redirectPath = resolvePostAuthRedirect(
        effectiveRole,
        {
          teacher_onboarding_complete: profile?.teacher_onboarding_complete,
          companion_chosen: profile?.companion_chosen,
        },
        oauthNext,
      );
      router.replace(redirectPath);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, router, oauthNext, isTeacherInvite]);

  const { t } = useLocale();
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!legalAccepted || busy) return;
    setBusy(true);
    try {
      const signUpRole = parsePublicSignUpRoleParam(roleParam);
      if (signUpRole === "teacher") {
        await loginWithGoogle(oauthNext, "teacher", refCode);
      } else {
        await loginWithGoogle(oauthNext, undefined, refCode);
      }
    } catch (e) {
      console.error(e);
      alert("Connexion impossible. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAFCFB]">
      <header
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          background: "white",
          zIndex: 50,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
          borderBottom: "0.5px solid #D3D1C7",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <PratiqoLogo variant="full" size="md" />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LocaleSwitcher />
        </div>
      </header>

      <div className="flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[var(--p-border-light)] bg-white p-8 sm:p-10 shadow-[0_24px_80px_rgba(15,110,86,0.08)]">
        <div className="flex justify-center mb-8">
          <PratiqoLogo variant="full" size="md" />
        </div>

        {isTeacherInvite ? (
          <p className="text-center text-sm font-semibold text-teal-700 bg-teal-500/10 rounded-2xl px-4 py-3 mb-6">
            {t("loginTeacherInviteBanner")}
          </p>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 mb-4">
          <input
            type="checkbox"
            checked={legalAccepted}
            onChange={(e) => setLegalAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-2 focus:ring-teal-500"
          />
          <span className="text-sm font-semibold text-[var(--p-text)] leading-snug">
            {t("loginAcceptTermsLabel")}
          </span>
        </label>

        <p className="text-xs text-[var(--p-text-muted)] mb-6 text-center leading-relaxed">
          {t("loginContinueAccept")}{" "}
          <Link href="/legal/cgu" className="font-semibold text-teal-700 underline underline-offset-2">
            {t("footerTerms")}
          </Link>{" "}
          {t("loginConsentAnd")}{" "}
          <Link href="/legal/confidentialite" className="font-semibold text-teal-700 underline underline-offset-2">
            {t("loginPrivacyPolicy")}
          </Link>
          .
        </p>

        <button
          type="button"
          disabled={!legalAccepted || busy}
          onClick={() => void handleLogin()}
          className={cn(
            "w-full h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all",
            "bg-teal-600 hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
          )}
        >
          <LogIn size={18} />
          {busy ? "Connexion…" : "Se connecter avec Google"}
        </button>

        <p className="mt-8 text-center text-sm text-[var(--p-text-muted)]">
          <Link href="/" className="font-semibold text-teal-700 hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-[var(--p-text-muted)]">Chargement…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
