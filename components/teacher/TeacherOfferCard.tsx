"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { localeToBcp47 } from "@/lib/i18n/types";
import type { TeacherOfferTranslator } from "@/lib/offers/display";
import type { TeacherOfferDto } from "@/lib/offers/types";
import {
  formatTeacherOfferCapacity,
  formatTeacherOfferCancellationPreferenceChip,
  formatTeacherOfferDiscipline,
  formatTeacherOfferDuration,
  formatTeacherOfferFormatLabel,
  formatTeacherOfferPrice,
  formatTeacherOfferReschedulePreferenceChip,
  formatTeacherOfferSessions,
  formatTeacherOfferStatusLabel,
  formatTeacherOfferTypeLabel,
  getTeacherOfferStatusActions,
  teacherOfferStatusTone,
  type TeacherOfferStatusAction,
} from "@/lib/offers/display";
import { cn } from "@/lib/utils";
import { TeacherOfferCoverImage } from "@/components/teacher/TeacherOfferCoverImage";

type Props = {
  offer: TeacherOfferDto;
  busy?: boolean;
  onAction: (action: TeacherOfferStatusAction) => void;
};

export function TeacherOfferCard({ offer, busy = false, onAction }: Props) {
  const { t, locale } = useLocale();
  const actions = getTeacherOfferStatusActions(offer.status);
  const discipline = formatTeacherOfferDiscipline(offer.disciplineId, locale);
  const duration = formatTeacherOfferDuration(offer.durationMinutes, t);
  const sessions = formatTeacherOfferSessions(offer, t);
  const capacity = formatTeacherOfferCapacity(offer, t);
  const updated = new Intl.DateTimeFormat(localeToBcp47(locale), {
    dateStyle: "medium",
  }).format(new Date(offer.updatedAt || offer.createdAt));

  const meta = [
    formatTeacherOfferTypeLabel(offer.offerType, t),
    formatTeacherOfferFormatLabel(offer.format, t),
    discipline,
    duration,
    sessions,
    capacity,
    formatTeacherOfferCancellationPreferenceChip(offer.cancellationPreference, t),
    formatTeacherOfferReschedulePreferenceChip(offer.reschedulePreference, t),
  ].filter(Boolean);

  return (
    <article className="rounded-2xl border border-[#DCEAE3] bg-white p-4 shadow-sm">
      <div className="mb-3">
        <TeacherOfferCoverImage
          imageUrl={offer.imageUrl}
          title={offer.title}
          alt={t("teacherOffersCoverAlt").replace("{title}", offer.title)}
          aspectClassName="aspect-[16/9] max-h-40"
        />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-[#2C2C2A]">{offer.title}</h3>
            <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", teacherOfferStatusTone(offer.status))}>
              {formatTeacherOfferStatusLabel(offer.status, t)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{meta.join(" · ")}</p>
          <p className="mt-2 text-sm font-semibold text-teal-800">{formatTeacherOfferPrice(offer.priceCents, locale)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {t("teacherOffersUpdated").replace("{date}", updated)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              disabled={busy}
              className={cn(
                "inline-flex h-10 min-w-[5.5rem] items-center justify-center rounded-full px-3 text-xs font-semibold disabled:opacity-60",
                action === "archive"
                  ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  : action === "publish"
                    ? "bg-teal-700 text-white hover:bg-teal-800"
                    : "border border-teal-200 text-teal-800 hover:bg-teal-50",
              )}
              onClick={() => onAction(action)}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : labelFor(action, offer.status, t)}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

function labelFor(
  action: TeacherOfferStatusAction,
  status: TeacherOfferDto["status"],
  t: TeacherOfferTranslator,
) {
  if (action === "edit") return t("teacherOffersEdit");
  if (action === "view") return t("teacherOffersView");
  if (action === "pause") return t("teacherOffersPause");
  if (action === "archive") return t("teacherOffersArchive");
  return status === "paused" ? t("teacherOffersPublishAgain") : t("teacherOffersPublish");
}
