"use client";

import React, { useId, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { TEACHER_OFFER_FORMATS, TEACHER_OFFER_MVP_TYPES } from "@/lib/offers/types";
import type { TeacherOfferFormFieldError, TeacherOfferFormValues } from "@/lib/offers/clientPayload";
import {
  formatTeacherOfferFormatLabel,
  formatTeacherOfferTypeLabel,
  teacherOfferFormErrorKey,
} from "@/lib/offers/display";
import { isTeacherOfferFormPublishReady } from "@/lib/offers/publishReadiness";
import { getActiveDisciplines, getDisciplineLabel } from "@/lib/taxonomy/disciplines";
import { cn } from "@/lib/utils";
import { TeacherOfferPublishChecklist } from "@/components/teacher/TeacherOfferPublishChecklist";
import { TeacherOfferPreview } from "@/components/teacher/TeacherOfferPreview";

type Props = {
  values: TeacherOfferFormValues;
  errors: TeacherOfferFormFieldError[];
  readOnly?: boolean;
  saving?: boolean;
  onChange: (patch: Partial<TeacherOfferFormValues>) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onCancel: () => void;
};

function FieldError({
  errors,
  keys,
}: {
  errors: TeacherOfferFormFieldError[];
  keys: TeacherOfferFormFieldError[];
}) {
  const { t } = useLocale();
  const match = keys.find((key) => errors.includes(key));
  if (!match) return null;
  return <p className="mt-1 text-xs font-medium text-rose-700">{t(teacherOfferFormErrorKey(match))}</p>;
}

function Label({
  htmlFor,
  children,
  optional,
}: {
  htmlFor: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  const { t } = useLocale();
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
      {optional ? (
        <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">
          ({t("teacherOffersOptional")})
        </span>
      ) : null}
    </label>
  );
}

function Section({
  id,
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const panelId = `${id}-panel`;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <h3>
        <button
          type="button"
          id={`${id}-button`}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          onClick={onToggle}
        >
          <span>
            <span className="block text-sm font-bold text-slate-900">{title}</span>
            {hint ? <span className="mt-0.5 block text-xs font-medium text-slate-500">{hint}</span> : null}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={`${id}-button`} hidden={!open} className="border-t border-slate-100 px-4 py-4">
        {children}
      </div>
    </section>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-50 disabled:text-slate-500";

export function TeacherOfferForm({
  values,
  errors,
  readOnly = false,
  saving = false,
  onChange,
  onSaveDraft,
  onPublish,
  onCancel,
}: Props) {
  const { t, locale } = useLocale();
  const disciplines = getActiveDisciplines();
  const disabled = readOnly || saving;
  const publishReady = isTeacherOfferFormPublishReady(values);
  const isPackage = values.offerType === "package";
  const formId = useId();
  const [openEssentials, setOpenEssentials] = useState(true);
  const [openPresentation, setOpenPresentation] = useState(true);
  const [openAdvanced, setOpenAdvanced] = useState(false);
  const [openMobilePreview, setOpenMobilePreview] = useState(false);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!readOnly) onSaveDraft();
        }}
      >
        {!readOnly ? <TeacherOfferPublishChecklist values={values} /> : null}

        <Section
          id={`${formId}-essentials`}
          title={t("teacherOffersSectionEssentials")}
          hint={t("teacherOffersSectionEssentialsHint")}
          open={openEssentials}
          onToggle={() => setOpenEssentials((value) => !value)}
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="offer-title">{t("teacherOffersFieldTitle")}</Label>
              <input
                id="offer-title"
                className={inputClass}
                value={values.title}
                maxLength={120}
                disabled={disabled}
                placeholder={t("teacherOffersPlaceholderTitle")}
                onChange={(event) => onChange({ title: event.target.value })}
              />
              <FieldError errors={errors} keys={["title", "titleLong"]} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="offer-type">{t("teacherOffersFieldType")}</Label>
                <select
                  id="offer-type"
                  className={inputClass}
                  value={values.offerType}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({ offerType: event.target.value as TeacherOfferFormValues["offerType"] })
                  }
                >
                  {TEACHER_OFFER_MVP_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatTeacherOfferTypeLabel(type, t)}
                    </option>
                  ))}
                </select>
                <FieldError errors={errors} keys={["offerType"]} />
              </div>
              <div>
                <Label htmlFor="offer-format">{t("teacherOffersFieldFormat")}</Label>
                <select
                  id="offer-format"
                  className={inputClass}
                  value={values.format}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({ format: event.target.value as TeacherOfferFormValues["format"] })
                  }
                >
                  {TEACHER_OFFER_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {formatTeacherOfferFormatLabel(format, t)}
                    </option>
                  ))}
                </select>
                <FieldError errors={errors} keys={["format"]} />
              </div>
            </div>

            <div>
              <Label htmlFor="offer-discipline">{t("teacherOffersFieldDiscipline")}</Label>
              <select
                id="offer-discipline"
                className={inputClass}
                value={values.disciplineId}
                disabled={disabled}
                onChange={(event) => onChange({ disciplineId: event.target.value })}
              >
                <option value="">{t("teacherOffersNoneSelected")}</option>
                {disciplines.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getDisciplineLabel(item, locale)}
                  </option>
                ))}
              </select>
              <FieldError errors={errors} keys={["discipline"]} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="offer-price">{t("teacherOffersFieldPrice")}</Label>
                <input
                  id="offer-price"
                  inputMode="decimal"
                  className={inputClass}
                  placeholder={t("teacherOffersPlaceholderPrice")}
                  value={values.priceDollars}
                  disabled={disabled}
                  onChange={(event) => onChange({ priceDollars: event.target.value })}
                />
                <FieldError errors={errors} keys={["price", "priceInvalid"]} />
              </div>
              <div>
                <Label htmlFor="offer-duration">{t("teacherOffersFieldDuration")}</Label>
                <input
                  id="offer-duration"
                  inputMode="numeric"
                  className={inputClass}
                  placeholder={t("teacherOffersPlaceholderDuration")}
                  value={values.durationMinutes}
                  disabled={disabled}
                  onChange={(event) => onChange({ durationMinutes: event.target.value })}
                />
                <FieldError errors={errors} keys={["duration"]} />
              </div>
            </div>

            {isPackage ? (
              <div>
                <Label htmlFor="offer-sessions-essential">{t("teacherOffersFieldSessionCount")}</Label>
                <input
                  id="offer-sessions-essential"
                  inputMode="numeric"
                  className={inputClass}
                  value={values.sessionCount}
                  disabled={disabled}
                  placeholder={t("teacherOffersPlaceholderSessionCount")}
                  onChange={(event) => onChange({ sessionCount: event.target.value })}
                />
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {t("teacherOffersPackageHint")}
                </p>
                <FieldError errors={errors} keys={["session"]} />
              </div>
            ) : null}
          </div>
        </Section>

        <Section
          id={`${formId}-presentation`}
          title={t("teacherOffersSectionPresentation")}
          hint={t("teacherOffersSectionPresentationHint")}
          open={openPresentation}
          onToggle={() => setOpenPresentation((value) => !value)}
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="offer-short">{t("teacherOffersFieldShortDescription")}</Label>
              <input
                id="offer-short"
                className={inputClass}
                maxLength={220}
                value={values.shortDescription}
                disabled={disabled}
                placeholder={t("teacherOffersPlaceholderShortDescription")}
                onChange={(event) => onChange({ shortDescription: event.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">{t("teacherOffersShortDescriptionHint")}</p>
              <FieldError errors={errors} keys={["shortDescription"]} />
            </div>

            <div>
              <Label htmlFor="offer-description" optional>
                {t("teacherOffersFieldDescription")}
              </Label>
              <textarea
                id="offer-description"
                className={cn(inputClass, "h-28 py-2")}
                maxLength={5000}
                value={values.description}
                disabled={disabled}
                placeholder={t("teacherOffersPlaceholderDescription")}
                onChange={(event) => onChange({ description: event.target.value })}
              />
              <FieldError errors={errors} keys={["description"]} />
            </div>
          </div>
        </Section>

        <Section
          id={`${formId}-advanced`}
          title={t("teacherOffersSectionAdvanced")}
          hint={t("teacherOffersSectionAdvancedHint")}
          open={openAdvanced}
          onToggle={() => setOpenAdvanced((value) => !value)}
        >
          <div className="space-y-4">
            {!isPackage ? (
              <div>
                <Label htmlFor="offer-sessions" optional>
                  {t("teacherOffersFieldSessionCount")}
                </Label>
                <input
                  id="offer-sessions"
                  inputMode="numeric"
                  className={inputClass}
                  value={values.sessionCount}
                  disabled={disabled}
                  onChange={(event) => onChange({ sessionCount: event.target.value })}
                />
                <FieldError errors={errors} keys={["session"]} />
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="offer-cap-min" optional>
                  {t("teacherOffersFieldCapacityMin")}
                </Label>
                <input
                  id="offer-cap-min"
                  inputMode="numeric"
                  className={inputClass}
                  value={values.capacityMin}
                  disabled={disabled}
                  onChange={(event) => onChange({ capacityMin: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="offer-cap-max" optional>
                  {t("teacherOffersFieldCapacityMax")}
                </Label>
                <input
                  id="offer-cap-max"
                  inputMode="numeric"
                  className={inputClass}
                  value={values.capacityMax}
                  disabled={disabled}
                  onChange={(event) => onChange({ capacityMax: event.target.value })}
                />
                <FieldError errors={errors} keys={["capacity"]} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="offer-level" optional>
                  {t("teacherOffersFieldLevel")}
                </Label>
                <input
                  id="offer-level"
                  className={inputClass}
                  value={values.level}
                  disabled={disabled}
                  placeholder={t("teacherOffersPlaceholderLevel")}
                  onChange={(event) => onChange({ level: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="offer-age-min" optional>
                  {t("teacherOffersFieldAgeMin")}
                </Label>
                <input
                  id="offer-age-min"
                  inputMode="numeric"
                  className={inputClass}
                  value={values.ageMin}
                  disabled={disabled}
                  onChange={(event) => onChange({ ageMin: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="offer-age-max" optional>
                  {t("teacherOffersFieldAgeMax")}
                </Label>
                <input
                  id="offer-age-max"
                  inputMode="numeric"
                  className={inputClass}
                  value={values.ageMax}
                  disabled={disabled}
                  onChange={(event) => onChange({ ageMax: event.target.value })}
                />
                <FieldError errors={errors} keys={["age"]} />
              </div>
            </div>

            <div>
              <Label htmlFor="offer-specialite" optional>
                {t("teacherOffersFieldSpecialite")}
              </Label>
              <input
                id="offer-specialite"
                className={inputClass}
                value={values.specialite}
                disabled={disabled}
                placeholder={t("teacherOffersPlaceholderSpecialite")}
                onChange={(event) => onChange({ specialite: event.target.value })}
              />
            </div>

            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={values.requiresManualConfirmation}
                  disabled={disabled}
                  onChange={(event) => onChange({ requiresManualConfirmation: event.target.checked })}
                />
                {t("teacherOffersFieldRequiresManualConfirmation")}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={values.requiresIdentity}
                  disabled={disabled}
                  onChange={(event) => onChange({ requiresIdentity: event.target.checked })}
                />
                {t("teacherOffersFieldRequiresIdentity")}
              </label>
            </div>
          </div>
        </Section>

        <div className="lg:hidden">
          <Section
            id={`${formId}-preview-mobile`}
            title={t("teacherOffersPreviewLabel")}
            open={openMobilePreview}
            onToggle={() => setOpenMobilePreview((value) => !value)}
          >
            <TeacherOfferPreview values={values} />
          </Section>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            onClick={onCancel}
          >
            {readOnly ? t("teacherOffersClose") : t("teacherOffersCancel")}
          </button>
          {readOnly ? null : (
            <>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("teacherOffersSaveDraft")}
              </button>
              <button
                type="button"
                disabled={saving || !publishReady}
                title={!publishReady ? t("teacherOffersPublishDisabledHint") : undefined}
                aria-disabled={saving || !publishReady}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                onClick={() => {
                  if (!publishReady || saving) return;
                  onPublish();
                }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("teacherOffersPublish")}
              </button>
            </>
          )}
        </div>
        {!readOnly && !publishReady ? (
          <p className="text-xs text-slate-500 sm:text-right" role="note">
            {t("teacherOffersPublishDisabledHint")}
          </p>
        ) : null}
      </form>

      <div className="hidden lg:block">
        <div className="sticky top-0">
          <TeacherOfferPreview values={values} />
        </div>
      </div>
    </div>
  );
}
