"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { useAuth } from "../../../components/AuthProvider";
import { getSupabaseClient } from "../../../lib/supabase";
import { useLocale } from "@/lib/locale-context";
import {
  LEGAL_ROUTES,
  getUpgradeCopy,
} from "@/lib/config/membrePro";

export default function UpgradePage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = getUpgradeCopy(locale);
  const [loading, setLoading] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  const startUpgrade = async () => {
    if (!legalAccepted) {
      alert(copy.alertMustAcceptLegal);
      return;
    }
    if (!user) {
      alert(copy.alertSignInRequired);
      return;
    }
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? null;
    if (!token) {
      alert(copy.alertSessionExpired);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/pro/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || "Stripe error");
      window.location.href = json.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : copy.alertStripeError);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white border border-slate-200 rounded-3xl p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="ds-label text-[var(--p-text-subtle)]">{copy.eyebrow}</p>
            <h1 className="text-[32px] sm:text-[40px] leading-[1.1] text-[var(--p-text)]">
              {copy.heading}
            </h1>
            <p className="mt-2 text-[14px] text-[var(--p-text-muted)]">{copy.summary}</p>
          </div>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-[16px] bg-teal-500/15 text-teal-700 font-medium">
            <Star size={16} /> {copy.badge}
          </span>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <PlanCard
            title={copy.freePlanTitle}
            price={copy.freePlanPrice}
            items={[copy.freePlanActiveStudentLimit, copy.freePlanCommission]}
            accent="bg-slate-100 text-slate-700"
          />
          <PlanCard
            title={copy.proPlanTitle}
            price={copy.proPlanPrice}
            items={[
              copy.proPlanUnlimitedStudents,
              copy.proPlanCommission,
              copy.proPlanPrioritySupport,
            ]}
            accent="bg-teal-500/15 text-teal-700"
          />
        </div>
        <p className="mt-5 text-center text-[12px]" style={{ color: "#6B6A65" }}>
          {copy.comingSoonNote}
        </p>

        <p className="mt-6 max-w-xl text-[12px] leading-relaxed text-[var(--p-text-muted)]">
          {copy.disclosureLead}
          <strong>{copy.disclosureRenewBold}</strong>
          {copy.disclosureRenewTail}
          {copy.disclosureLinksLead}
          <Link
            href={LEGAL_ROUTES.membrePro}
            className="text-teal-700 underline font-medium"
          >
            {copy.disclosureMembreProLinkLabel}
          </Link>
          {copy.disclosureLinkConjunction}
          <Link
            href={LEGAL_ROUTES.paiements}
            className="text-teal-700 underline font-medium"
          >
            {copy.disclosurePaymentsLinkLabel}
          </Link>
          .
        </p>

        <label className="mt-6 flex items-start gap-3 text-[13px] text-[var(--p-text-muted)] cursor-pointer max-w-xl">
          <input
            type="checkbox"
            checked={legalAccepted}
            onChange={(e) => setLegalAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
          />
          <span>
            {copy.acceptPrefix}
            <Link
              href={LEGAL_ROUTES.cgu}
              className="text-teal-700 underline font-medium"
            >
              {copy.acceptCguLabel}
            </Link>
            {copy.acceptLinkSeparator}
            <Link
              href={LEGAL_ROUTES.membrePro}
              className="text-teal-700 underline font-medium"
            >
              {copy.acceptMembreProLabel}
            </Link>
            {copy.acceptLinkSeparator}
            <Link
              href={LEGAL_ROUTES.annulation}
              className="text-teal-700 underline font-medium"
            >
              {copy.acceptAnnulationLabel}
            </Link>
            {copy.acceptLinkFinalConjunction}
            <Link
              href={LEGAL_ROUTES.confidentialite}
              className="text-teal-700 underline font-medium"
            >
              {copy.acceptConfidentialiteLabel}
            </Link>
            .
          </span>
        </label>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={startUpgrade}
            disabled={loading || !legalAccepted}
            className="h-11 px-6 rounded-[22px] text-sm font-medium bg-teal-600 text-white hover:brightness-[0.98] disabled:opacity-60"
          >
            {loading ? copy.primaryCtaLoading : copy.primaryCta}
          </button>
          <button
            onClick={signOut}
            className="h-11 px-6 rounded-[22px] text-sm font-medium bg-white border border-[var(--p-border-light)] text-[var(--p-text)] hover:bg-[rgba(225,245,238,0.6)]"
          >
            {copy.signOutCta}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  title,
  price,
  items,
  accent,
}: {
  title: string;
  price: string;
  items: string[];
  accent: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6">
      <div className="flex items-center justify-between gap-4">
        <span className={`px-3 py-1 rounded-[12px] text-[12px] font-medium ${accent}`}>{title}</span>
        <span className="text-[18px] font-medium text-[var(--p-text)]">{price}</span>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((x) => (
          <div key={x} className="flex items-center gap-2 text-[13px] text-[var(--p-text-muted)]">
            <Check size={16} className="text-teal-700" />
            <span>{x}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
