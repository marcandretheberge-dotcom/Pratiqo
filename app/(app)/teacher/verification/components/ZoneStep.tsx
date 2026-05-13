"use client";

import { Loader2, MapPinned } from "lucide-react";
import type { VerificationStepState } from "@/lib/verificationState";
import type { TranslationKey } from "@/lib/translations";

type Props = {
  zone: VerificationStepState;
  busy: string | null;
  zoneShowManual: boolean;
  zoneSingleLine: string;
  zoneHasPrivateAddress: boolean;
  zoneAddressLine1: string;
  zoneAddressLine2: string;
  zoneCity: string;
  zoneRegion: string;
  zonePostalCode: string;
  zoneCountryCode: string;
  zoneRadiusKm: string;
  zoneSavedStatus: string | null;
  zoneFuzzRadiusKm: number | null;
  savedCity: string;
  savedRegion: string;
  onShowManualToggle: () => void;
  onSingleLineChange: (v: string) => void;
  onLine1Change: (v: string) => void;
  onLine2Change: (v: string) => void;
  onCityChange: (v: string) => void;
  onRegionChange: (v: string) => void;
  onPostalCodeChange: (v: string) => void;
  onCountryCodeChange: (v: string) => void;
  onRadiusChange: (v: string) => void;
  onSubmit: () => void;
  t: (key: TranslationKey) => string;
  addressInputRef?: React.RefObject<HTMLInputElement | null>;
};

export function ZoneStep({
  zone,
  busy,
  zoneShowManual,
  zoneSingleLine,
  zoneHasPrivateAddress,
  zoneAddressLine1,
  zoneAddressLine2,
  zoneCity,
  zoneRegion,
  zonePostalCode,
  zoneCountryCode,
  zoneRadiusKm,
  zoneSavedStatus,
  zoneFuzzRadiusKm,
  savedCity,
  savedRegion,
  onShowManualToggle,
  onSingleLineChange,
  onLine1Change,
  onLine2Change,
  onCityChange,
  onRegionChange,
  onPostalCodeChange,
  onCountryCodeChange,
  onRadiusChange,
  onSubmit,
  t,
  addressInputRef,
}: Props) {
  const displayCity = zoneCity || savedCity;
  const displayRegion = zoneRegion || savedRegion;
  const showPublicSummary =
    (zoneSavedStatus || zone.kind === "verified" || zone.kind === "pending") && displayCity;

  return (
    <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5 space-y-4">
      <div className="flex gap-3">
        <MapPinned className="text-teal-700 shrink-0 mt-0.5" size={22} />
        <div className="min-w-0">
          <p className="font-semibold text-[#2C2C2A]">{t("verificationLevel4Title")}</p>
          <p className="text-sm text-[#6B6A65] mt-1">{t("verificationLevel4BodyZone")}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#DCEAE3] bg-[#F3FAF6] px-4 py-3 text-xs text-teal-800">
        {t("verificationZonePrivacyNote")}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="zone-address-single"
          className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]"
        >
          {t("verificationZoneAddressLabel")}
        </label>
        <input
          ref={addressInputRef}
          id="zone-address-single"
          type="text"
          value={zoneSingleLine}
          onChange={(e) => onSingleLineChange(e.target.value)}
          placeholder={t("verificationZoneAddressPlaceholder")}
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
        />
        <p className="text-xs text-[#6B6A65]">{t("verificationZoneAddressHint")}</p>
      </div>

      <button
        type="button"
        onClick={onShowManualToggle}
        className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
      >
        {zoneShowManual ? t("verificationZoneHideManual") : t("verificationZoneShowManual")}
      </button>

      {zoneShowManual ? (
        <div className="rounded-xl border border-[#DCEAE3] bg-[#F8F7F2] p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
            {t("verificationZoneManualHeading")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-[#6B6A65]">{t("zoneAddressLine1Label")}</span>
              <input
                value={zoneAddressLine1}
                onChange={(e) => onLine1Change(e.target.value)}
                placeholder="123 Rue Principale"
                className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-[#6B6A65]">
                {t("verificationZoneAptLabel")}
              </span>
              <input
                value={zoneAddressLine2}
                onChange={(e) => onLine2Change(e.target.value)}
                placeholder="Apt 2"
                className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-[#6B6A65]">
                {t("verificationZoneCityLabel")}
              </span>
              <input
                value={zoneCity}
                onChange={(e) => onCityChange(e.target.value)}
                placeholder="Montréal"
                className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-[#6B6A65]">
                {t("verificationZoneRegionLabel")}
              </span>
              <input
                value={zoneRegion}
                onChange={(e) => onRegionChange(e.target.value)}
                placeholder="Québec"
                className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-[#6B6A65]">{t("zonePostalCodeLabel")}</span>
              <input
                value={zonePostalCode}
                onChange={(e) => onPostalCodeChange(e.target.value)}
                placeholder="H2X 1Y1"
                className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-[#6B6A65]">
                {t("verificationZoneCountryCodeLabel")}
              </span>
              <input
                value={zoneCountryCode}
                onChange={(e) => onCountryCodeChange(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="CA"
                maxLength={2}
                className="h-11 w-full rounded-xl border border-[#E8E6DF] bg-white px-3 text-sm outline-none focus:border-teal-500"
              />
            </label>
          </div>
        </div>
      ) : null}

      <label className="space-y-1 block">
        <span className="text-xs font-bold uppercase tracking-widest text-[#6B6A65]">
          {t("zoneRadiusKmLabel")}
        </span>
        <input
          value={zoneRadiusKm}
          onChange={(e) => onRadiusChange(e.target.value)}
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
        onClick={onSubmit}
        className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50 inline-flex items-center gap-2"
      >
        {busy === "zone" ? <Loader2 size={16} className="animate-spin" /> : <MapPinned size={16} />}
        {t("zoneSaveButton")}
      </button>

      {showPublicSummary ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {t("zonePublicDisplay")}
          </p>
          <p className="text-sm font-semibold text-[#2C2C2A]">
            {displayCity}
            {displayRegion ? `, ${displayRegion}` : ""}
          </p>
          <p className="text-xs text-[#6B6A65]">± {zoneFuzzRadiusKm ?? 1} km</p>
          {zoneSavedStatus === "auto_verified" || zone.kind === "verified" ? (
            <p className="text-xs font-semibold text-teal-700">{t("trustZoneVerified")}</p>
          ) : (
            <p className="text-xs font-semibold text-amber-700">{t("trustZonePending")}</p>
          )}
          <p className="text-[11px] text-slate-400">{t("exactAddressPrivate")}</p>
          {zoneHasPrivateAddress ? (
            <p className="text-[11px] text-slate-400">{t("verificationZoneSummarySourceSaved")}</p>
          ) : (
            <>
              <p className="text-[11px] text-slate-400">{t("verificationZoneSummarySourceOld")}</p>
              <p className="text-[11px] text-amber-600">
                {t("verificationZoneSummarySourceOldPrompt")}
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
