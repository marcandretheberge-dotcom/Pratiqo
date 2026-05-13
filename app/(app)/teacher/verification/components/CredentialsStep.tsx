"use client";

import { CheckCircle2, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrustBadge } from "@/lib/teacherTrust";
import type { TranslationKey } from "@/lib/translations";

type CredentialRow = {
  id: string;
  teacher_id: string;
  type: "degree" | "certificate" | "license" | "experience" | "portfolio";
  title: string;
  institution_name: string | null;
  country: string | null;
  issued_year: number | null;
  verification_status:
    | "not_started"
    | "pending"
    | "verified"
    | "rejected"
    | "needs_review"
    | "expired";
  verification_method: string | null;
  confidence_level: string | null;
  public_label: string | null;
  verified_at: string | null;
  expires_at: string | null;
  created_at: string | null;
};

function statusLabelKey(status: CredentialRow["verification_status"]): TranslationKey {
  if (status === "verified") return "credentialStatusVerified";
  if (status === "needs_review") return "credentialStatusNeedsReview";
  if (status === "rejected") return "credentialStatusRejected";
  if (status === "expired") return "credentialStatusExpired";
  return "credentialStatusPending";
}

type Props = {
  credentials: CredentialRow[];
  credType: CredentialRow["type"];
  credTitle: string;
  credInstitution: string;
  credCountry: string;
  credIssuedYear: string;
  credMethod: string;
  busy: string | null;
  badgePreview: TrustBadge[];
  onTypeChange: (v: CredentialRow["type"]) => void;
  onTitleChange: (v: string) => void;
  onInstitutionChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  onIssuedYearChange: (v: string) => void;
  onMethodChange: (v: string) => void;
  onSubmit: () => void;
  t: (key: TranslationKey) => string;
};

export function CredentialsStep({
  credentials,
  credType,
  credTitle,
  credInstitution,
  credCountry,
  credIssuedYear,
  credMethod,
  busy,
  badgePreview,
  onTypeChange,
  onTitleChange,
  onInstitutionChange,
  onCountryChange,
  onIssuedYearChange,
  onMethodChange,
  onSubmit,
  t,
}: Props) {
  return (
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
          <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
            {t("credentialType")}
          </span>
          <select
            value={credType}
            onChange={(e) => onTypeChange(e.target.value as CredentialRow["type"])}
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
          <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
            {t("credentialMethod")}
          </span>
          <select
            value={credMethod}
            onChange={(e) => onMethodChange(e.target.value)}
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
        <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("credentialTitle")}
        </span>
        <input
          value={credTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t("credentialTitlePlaceholder")}
          className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
            {t("credentialInstitution")}
          </span>
          <input
            value={credInstitution}
            onChange={(e) => onInstitutionChange(e.target.value)}
            className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
            {t("credentialCountry")}
          </span>
          <input
            value={credCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            placeholder="CA"
            className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
            {t("credentialIssuedYear")}
          </span>
          <input
            value={credIssuedYear}
            onChange={(e) => onIssuedYearChange(e.target.value)}
            inputMode="numeric"
            placeholder="2020"
            className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={busy !== null}
        className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 inline-flex items-center gap-2"
      >
        {busy === "credentials" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <UploadCloud size={16} />
        )}
        {t("credentialSubmit")}
      </button>

      {credentials.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
            {t("credentialsSubmitted")}
          </p>
          <ul className="mt-3 space-y-2">
            {credentials.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.title}</p>
                  <p className="text-xs text-slate-600">
                    {[c.institution_name, c.country, c.issued_year ? String(c.issued_year) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    c.verification_status === "verified"
                      ? "bg-teal-50 text-teal-700"
                      : c.verification_status === "needs_review"
                        ? "bg-amber-100 text-amber-800"
                        : c.verification_status === "rejected"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-700",
                  )}
                >
                  {t(statusLabelKey(c.verification_status))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border border-[#DCEAE3] bg-[#F3FAF6] p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
          {t("publicBadgePreview")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {badgePreview.length ? (
            badgePreview.map((b) => (
              <span
                key={b.key}
                title={t(b.descriptionKey)}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-[#DCEAE3] px-2.5 py-0.5 text-xs font-semibold text-teal-700"
              >
                <CheckCircle2 size={12} aria-hidden />
                {t(b.labelKey)}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-600">{t("publicBadgePreviewEmpty")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
