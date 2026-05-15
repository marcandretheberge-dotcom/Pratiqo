"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, LogIn, Search, ShieldCheck, Star } from "lucide-react";
import PratiqoLogo from "../../components/PratiqoLogo";
import { LocaleSwitcher } from "../../components/LocaleSwitcher";
import { LoginPageSkeleton } from "../../components/PratiqoLoadingStates";
import { useAuth } from "../../components/AuthProvider";
import { loginWithGoogle } from "../../lib/auth";
import { useLocale } from "../../lib/locale-context";
import { cn } from "../../lib/utils";

const trustItems = [
  { icon: ShieldCheck, label: "Paiements protégés", text: "Réservation, annulation et suivi centralisés." },
  { icon: Star, label: "Profils vérifiés", text: "Identité, diplôme et avis mis en avant quand disponibles." },
  { icon: Search, label: "Recherche locale", text: "Trouve un professeur par ville, matière et disponibilité." },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading, profile } = useAuth();
  const { t } = useLocale();
  const role = searchParams.get("role");
  const nextRaw = searchParams.get("next") || "/dashboard";
  const next = nextRaw.startsWith("/") ? nextRaw : `/${nextRaw}`;
  const refCode = searchParams.get("ref") ?? undefined;
  const isTeacherInvite = role === "teacher";
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if ((profile?.role as string | undefined) === "admin") {
        router.replace(next.startsWith("/admin") ? next : "/admin/operations");
        return;
      }
      router.replace(next);
    }
  }, [loading, user, router, next, profile?.role]);

  const handleLogin = async () => {
    if (!legalAccepted || busy) return;
    setBusy(true);
    try {
      await loginWithGoogle("/dashboard", role === "teacher" ? "teacher" : undefined, refCode);
    } catch (e) {
      console.error(e);
      alert("Connexion impossible. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F3] text-[#2C2C2A]">
      <header className="sticky top-0 z-50 border-b border-[#E4DED2] bg-[#FAF8F3]/90 px-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <PratiqoLogo variant="full" size="md" />
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_27rem] lg:items-center lg:px-6">
        <section className="order-2 space-y-7 lg:order-1">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full border border-[#CFE9E3] bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-800 shadow-sm">
              Marketplace local
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-normal text-[#2C2C2A] sm:text-5xl">
              Un espace clair pour réserver, enseigner et suivre chaque cours.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#6B6A65]">
              Pratiqo rassemble la recherche locale, les profils de confiance, les paiements et les messages dans une expérience simple et premium.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {trustItems.map(({ icon: Icon, label, text }) => (
              <div key={label} className="rounded-2xl border border-[#E4DED2] bg-white/80 p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF5F1] text-teal-700">
                  <Icon size={20} />
                </div>
                <p className="mt-3 text-sm font-bold text-[#2C2C2A]">{label}</p>
                <p className="mt-1 text-sm leading-5 text-[#6B6A65]">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="order-1 lg:order-2">
          <div className="rounded-[2rem] border border-[#E2DED4] bg-white p-5 shadow-[0_28px_90px_rgba(31,90,84,0.12)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-800">
                  {isTeacherInvite ? "Espace professeur" : "Connexion"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[#2C2C2A]">
                  {isTeacherInvite ? "Crée ton compte professeur" : "Reprendre là où tu en étais"}
                </h2>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF5F1] text-teal-700">
                <GraduationCap size={22} />
              </div>
            </div>

            {isTeacherInvite ? (
              <div className="mt-5 rounded-2xl border border-[#CFE9E3] bg-[#F1FAF7] px-4 py-3 text-sm font-semibold text-teal-800">
                Inscription gratuite. Tu pourras compléter ton profil, tes disponibilités et tes paiements après connexion.
              </div>
            ) : null}

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E4DED2] bg-[#FBFAF7] px-4 py-3">
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-sm font-semibold leading-snug text-[#2C2C2A]">{t("loginAcceptTermsLabel")}</span>
            </label>

            <p className="mt-3 text-xs leading-relaxed text-[#6B6A65]">
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
                "mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white transition-all",
                "bg-teal-700 shadow-[0_14px_32px_rgba(31,90,84,0.22)] hover:brightness-[0.98]",
                "disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none",
              )}
            >
              <LogIn size={18} />
              {busy ? "Connexion..." : "Continuer avec Google"}
            </button>

            <div className="mt-5 rounded-2xl bg-[#FBFAF7] px-4 py-3 text-xs leading-5 text-[#6B6A65]">
              Aucun mot de passe à gérer. La connexion Google garde l'accès rapide pour les élèves, professeurs et admins.
            </div>

            <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-teal-700 hover:underline">
              Retour à l'accueil
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
