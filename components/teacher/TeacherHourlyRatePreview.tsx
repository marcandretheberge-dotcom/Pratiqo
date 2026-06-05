"use client";

/**
 * components/teacher/TeacherHourlyRatePreview.tsx
 *
 * Live pricing preview shown inside the teacher "Offre et tarifs" card.
 *
 * What it does:
 *   • Takes the hourly rate the teacher just typed and a duration (either
 *     the saved `default_lesson_duration_minutes` or a local preview
 *     selector value).
 *   • Renders the four lines required by the launch brief:
 *       1. Hourly rate         : 45,00 $CA / h
 *       2. Lesson duration     : 45 min
 *       3. Price charged       : 33,75 $CA           (= hourly × duration / 60)
 *       4. Pratiqo commission  : X,XX $CA
 *       5. Estimated payout    : XX,XX $CA
 *   • Adds a cautious disclaimer (pre-tax, tier-dependent).
 *
 * Why a separate component (vs. the existing TeacherPayoutPreview):
 *   • The existing preview component is fed a *session price* and assumes
 *     the input is already what the student pays. Passing an hourly rate
 *     into it was the launch-blocking bug — every commission/net number
 *     was silently shown as if every lesson were 60 minutes. The math is
 *     centralised in `lib/pricing/hourlyRatePreview.ts`, which proxies the
 *     real commission helper, so no fee math is duplicated.
 *
 * Restrictions honoured: pure display, zero side effects, no fetch, no
 * payment / Stripe / Supabase / tax writes.
 */

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { formatCurrencyAmount } from "@/lib/currency/format";
import { getHourlyRatePreview } from "@/lib/pricing/hourlyRatePreview";
import {
  DEFAULT_LESSON_DURATION_MINUTES,
  isValidLessonDurationMinutes,
  normalizeLessonDurationMinutes,
} from "@/lib/pricing/lessonDuration";

type Props = {
  /** Hourly rate as typed by the teacher (number or numeric string). */
  hourlyRate: number | string | null | undefined;
  /**
   * Default lesson duration coming from `teachers.default_lesson_duration_minutes`.
   * The preview uses this value first and falls back to 60 min. Changing the
   * local preview selector does NOT mutate this value — it remains the saved
   * default and the booking pipeline keeps using the actual slot duration as
   * its source of truth.
   */
  defaultDurationMinutes?: number | null;
  /** Teacher plan to drive the correct commission tier. Default "free". */
  teacherPlan?: string | null;
  /** Optional annual volume to drive loyalty-tier inference. */
  annualVolumeCents?: number | null;
  /** Optional explicit loyalty tier override. */
  loyaltyTier?: string | null;
  /** Accounting/source currency. Always CAD at launch. */
  currency?: string | null;
  /** Optional copy override for the "Hourly rate" line — used by the
   *  at-home preview to read "Tarif horaire à domicile : …". */
  hourlyRateLineKey?:
    | "pricingPreviewHourlyRate"
    | "bookingPriceBreakdownHomeHourlyRate";
  /** Optional test-id prefix to disambiguate base vs. home preview. */
  testIdPrefix?: string;
};

const PREVIEW_DURATION_OPTIONS = [30, 45, 60, 90] as const;

function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

export function TeacherHourlyRatePreview({
  hourlyRate,
  defaultDurationMinutes,
  teacherPlan,
  annualVolumeCents,
  loyaltyTier,
  currency = "CAD",
  hourlyRateLineKey = "pricingPreviewHourlyRate",
  testIdPrefix = "teacher-hourly-rate-preview",
}: Props) {
  const { t, locale } = useLocale();
  const sourceCurrency = String(currency || "CAD").toUpperCase();

  const normalizedDefault = useMemo(() => {
    if (isValidLessonDurationMinutes(defaultDurationMinutes)) {
      return normalizeLessonDurationMinutes(defaultDurationMinutes);
    }
    return DEFAULT_LESSON_DURATION_MINUTES;
  }, [defaultDurationMinutes]);

  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number>(
    normalizedDefault,
  );

  const preview = useMemo(
    () =>
      getHourlyRatePreview({
        hourlyRate,
        durationMinutes: selectedDurationMinutes,
        teacherPlan,
        annualVolumeCents,
        loyaltyTier,
      }),
    [hourlyRate, selectedDurationMinutes, teacherPlan, annualVolumeCents, loyaltyTier],
  );

  if (!preview.isPositive) return null;

  const formatMoney = (dollars: number) =>
    formatCurrencyAmount(dollars, sourceCurrency, locale);

  const hourlyLine = fill(t(hourlyRateLineKey), {
    rate: formatMoney(preview.hourlyDollars),
  });
  const durationLine = fill(t("pricingPreviewDuration"), {
    minutes: String(preview.durationMinutes),
  });
  const lessonPriceLine = fill(t("pricingPreviewLessonPrice"), {
    price: formatMoney(preview.lessonPriceDollars),
  });
  const commissionLine = fill(t("pricingPreviewCommission"), {
    commission: formatMoney(preview.commissionDollars),
  });
  const payoutLine = fill(t("pricingPreviewPayout"), {
    net: formatMoney(preview.teacherNetDollars),
  });
  const defaultDurationNote = fill(t("pricingPreviewUsesDefaultDuration"), {
    minutes: String(normalizedDefault),
  });

  const showDefaultDurationNote = selectedDurationMinutes === normalizedDefault;

  return (
    <div
      className="mt-3 rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-4 text-sm text-slate-700"
      data-testid={`${testIdPrefix}`}
    >
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden />
        <div className="min-w-0 space-y-2 w-full">
          <p className="text-[11px] font-bold uppercase tracking-widest text-teal-700">
            {t("pricingPreviewTitle")}
          </p>

          {/* Preview duration selector. Editing this value does NOT change
              the saved default_lesson_duration_minutes; it only previews the
              math for a hypothetical lesson length. The booking pipeline
              still uses the real slot duration when charging. */}
          <label className="block text-xs text-slate-700">
            <span className="font-semibold">{t("pricingPreviewDurationSelectorLabel")}</span>
            <select
              value={selectedDurationMinutes}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (isValidLessonDurationMinutes(next)) {
                  setSelectedDurationMinutes(normalizeLessonDurationMinutes(next));
                }
              }}
              className="ml-2 inline-flex h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
              data-testid={`${testIdPrefix}-duration`}
            >
              {PREVIEW_DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {fill(t("pricingPreviewDurationOption"), { minutes: String(minutes) })}
                </option>
              ))}
            </select>
          </label>

          <ul className="space-y-1 text-xs text-slate-700">
            <li data-testid={`${testIdPrefix}-hourly`}>{hourlyLine}</li>
            <li data-testid={`${testIdPrefix}-duration-line`}>{durationLine}</li>
            <li
              className="font-semibold text-slate-900"
              data-testid={`${testIdPrefix}-lesson-price`}
            >
              {lessonPriceLine}
            </li>
            <li data-testid={`${testIdPrefix}-commission`}>{commissionLine}</li>
            <li
              className="font-semibold text-teal-700"
              data-testid={`${testIdPrefix}-payout`}
            >
              {payoutLine}
            </li>
          </ul>

          {showDefaultDurationNote ? (
            <p className="text-[11px] text-slate-500">{defaultDurationNote}</p>
          ) : null}
          <p className="text-[11px] italic text-slate-500">
            {t("pricingPreviewBeforeTaxesNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
