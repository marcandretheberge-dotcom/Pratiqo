"use client";

import { Info } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { getTeacherPayoutPreview } from "@/lib/payments/payoutPreview";

type Props = {
  grossAmount: number | string | null | undefined;
  currency?: string | null;
  teacherPlan?: string | null;
  annualVolumeCents?: number | null;
  loyaltyTier?: string | null;
};

function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}

function formatRate(rate: number, locale: string): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : locale === "es" ? "es-UY" : "en-CA", {
    maximumFractionDigits: 1,
  }).format(rate);
}

function tierLabel(tier: string, t: ReturnType<typeof useLocale>["t"]): string {
  if (tier === "argent") return t("tierSilver");
  if (tier === "or") return t("tierGold");
  if (tier === "platine") return t("tierPlatinum");
  return t("tierBronze");
}

export function TeacherPayoutPreview({
  grossAmount,
  currency = "CAD",
  teacherPlan,
  annualVolumeCents,
  loyaltyTier,
}: Props) {
  const { t, locale } = useLocale();
  const preview = getTeacherPayoutPreview({
    grossAmount,
    currency,
    teacherPlan,
    annualVolumeCents,
    loyaltyTier,
    bookingType: "individual",
    locale,
  });

  if (preview.grossCents <= 0) return null;

  const rate = formatRate(preview.feePercent, locale);
  const sentence = fill(t("teacherPayoutPreviewSentence"), {
    net: preview.formattedTeacherNet,
    rate,
  });
  const breakdown = fill(t("teacherPayoutPreviewBreakdown"), {
    gross: preview.formattedGross,
    commission: preview.formattedCommission,
    net: preview.formattedTeacherNet,
  });
  const planLine =
    !preview.isPlanKnown
      ? t("teacherPayoutPreviewFreeEstimate")
      : preview.plan === "pro"
        ? t("teacherPayoutPreviewProEstimate")
        : null;
  const tierLine = fill(t("teacherPayoutPreviewTier"), {
    tier: tierLabel(preview.tier, t),
  });
  const [beforeNet, afterNet = ""] = sentence.split(preview.formattedTeacherNet);

  return (
    <div className="mt-3 rounded-2xl border border-[#DCEAE3] bg-[#F3FAF6] p-4 text-sm text-slate-700">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6E56]" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#0F6E56]">
            {t("teacherPayoutPreviewTitle")}
          </p>
          <p className="leading-relaxed">
            {beforeNet}
            <strong className="font-bold text-[#0F6E56]">{preview.formattedTeacherNet}</strong>
            {afterNet}
          </p>
          <p className="text-xs text-slate-600">{breakdown}</p>
          {planLine ? <p className="text-xs text-slate-600">{planLine}</p> : null}
          <p className="text-xs font-medium text-[#0F6E56]">{tierLine}</p>
        </div>
      </div>
    </div>
  );
}
