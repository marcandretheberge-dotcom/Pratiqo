"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { cn } from "../../lib/utils";
import Logo from "../../components/ui/Logo";
import { loginWithGoogle } from "../../lib/auth";
import { useAuth } from "../../components/AuthProvider";
import { getSupabaseClient } from "../../lib/supabase";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const role = searchParams.get("role");
  const nextRaw = searchParams.get("next") || (role === "teacher" ? "/onboarding?role=teacher" : "/dashboard");
  const next = nextRaw.startsWith("/") ? nextRaw : `/${nextRaw}`;
  const isTeacherInvite = role === "teacher";

  useEffect(() => {
    if (loading || !user) return;

    const run = async () => {
      // Teacher flow: decide onboarding vs dashboard
      if (role === "teacher") {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from("profiles")
          .select("teacher_onboarding_complete, role")
          .eq("id", user.id)
          .maybeSingle();
        const done = Boolean((data as { teacher_onboarding_complete?: boolean } | null)?.teacher_onboarding_complete);
        router.replace(done ? "/dashboard" : "/onboarding");
        return;
      }

      router.replace(next);
    };

    void run();
  }, [loading, user, router, next, role]);

  const [legalAccepted, setLegalAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!legalAccepted || busy) return;
    setBusy(true);
    try {
      // Teachers always come back to /login?role=teacher after OAuth, so we can branch correctly.
      const redirectPath = role === "teacher" ? "/login?role=teacher" : next;
      await loginWithGoogle(redirectPath.startsWith("/") ? redirectPath : `/${redirectPath}`);
    } catch (e) {
      console.error(e);
      alert("Connexion impossible. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 py-12 bg-[#FAFCFB]">
      <div className="w-full max-w-md rounded-3xl border border-[var(--p-border-light)] bg-white p-8 sm:p-10 shadow-[0_24px_80px_rgba(15,110,86,0.08)]">
        <div className="flex justify-center mb-8">
          <Logo size="md" />
        </div>

        {isTeacherInvite ? (
          <p className="text-center text-sm font-semibold text-[#0f6d52] bg-[rgba(29,158,117,0.1)] rounded-2xl px-4 py-3 mb-6">
            Bienvenue professeur ! Crée ton compte gratuitement.
          </p>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 mb-4">
          <input
            type="checkbox"
            checked={legalAccepted}
            onChange={(e) => setLegalAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]"
          />
          <span className="text-sm font-semibold text-[var(--p-text)] leading-snug">
            J&apos;accepte les CGU et la politique de confidentialité
          </span>
        </label>

        <p className="text-xs text-[var(--p-text-muted)] mb-6 text-center leading-relaxed">
          En continuant, vous acceptez nos{" "}
          <Link href="/legal/cgu" className="font-semibold text-[#1D9E75] underline underline-offset-2">
            CGU
          </Link>{" "}
          et notre{" "}
          <Link href="/legal/confidentialite" className="font-semibold text-[#1D9E75] underline underline-offset-2">
            politique de confidentialité
          </Link>
          .
        </p>

        <button
          type="button"
          disabled={!legalAccepted || busy}
          onClick={() => void handleLogin()}
          className={cn(
            "w-full h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all",
            "bg-[#1D9E75] hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
          )}
        >
          <LogIn size={18} />
          {busy ? "Connexion…" : "Se connecter avec Google"}
        </button>

        <p className="mt-8 text-center text-sm text-[var(--p-text-muted)]">
          <Link href="/" className="font-semibold text-[#1D9E75] hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </p>
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
