"use client";

import React, { useMemo } from "react";
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
import { getMissingPublishFieldsForOffer } from "@/lib/offers/publishReadiness";
import { cn } from "@/lib/utils";
import { TeacherOfferCoverImage } from "@/components/teacher/TeacherOfferCoverImage";
import { TeacherOfferMissingFieldsAlert } from "@/components/teacher/TeacherOfferMissingFieldsAlert";

type Props = {
  offer: TeacherOfferDto;
  busy?: boolean;
  onAction: (action: TeacherOfferStatusAction) => void;
};

/**
 * Teacher offer card — stacked on mobile so title never overlaps actions.
 */
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

  const chips = [
    formatTeacherOfferTypeLabel(offer.offerType, t),
    formatTeacherOfferFormatLabel(offer.format, t),
    discipline,
    duration,
    sessions,
    capacity,
    formatTeacherOfferCancellationPreferenceChip(offer.cancellationPreference, t),
    formatTeacherOfferReschedulePreferenceChip(offer.reschedulePreference, t),
  ].filter(Boolean) as string[];

  const missingFields = useMemo(
    () => (offer.status === "draft" ? getMissingPublishFieldsForOffer(offer) : []),
    [offer],
  );
  const publishBlocked = offer.status === "draft" && missingFields.length > 0;

  const primary = actions.includes("edit")
    ? "edit"
    : actions.includes("view")
      ? "view"
      : actions[0];
  const secondary = actions.filter((action) => action !== primary);

  return (
    <article
      className="overflow-hidden rounded-2xl border border-[#DCEAE3] bg-white shadow-sm"
      data-testid="teacher-offer-card"
      data-status={offer.status}
    >
      <div className="p-4 sm:p-5">
        <TeacherOfferCoverImage
          imageUrl={offer.imageUrl}
          title={offer.title}
          alt={t("teacherOffersCoverAlt").replace("{title}", offer.title)}
          aspectClassName="aspect-[16/9] max-h-40"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
              teacherOfferStatusTone(offer.status),
            )}
          >
            {formatTeacherOfferStatusLabel(offer.status, t)}
          </span>
          {offer.status === "published" ? (
            <span className="text-[11px] font-semibold text-teal-800">
              {t("teacherOffersVisibleOnProfile")}
            </span>
          ) : null}
          {offer.status === "paused" ? (
            <span className="text-[11px] font-semibold text-amber-800">
              {t("teacherOffersNotVisibleToLearners")}
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 break-words text-base font-bold leading-snug text-[#2C2C2A] sm:text-lg">
          {offer.title}
        </h3>

        {offer.shortDescription ? (
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{offer.shortDescription}</p>
        ) : null}

        {chips.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t("teacherOffersMetaAria")}>
            {chips.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700"
              >
                {chip}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-3 text-sm font-semibold text-teal-800">
          {formatTeacherOfferPrice(offer.priceCents, locale)}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {t("teacherOffersUpdated").replace("{date}", updated)}
        </p>

        {publishBlocked ? (
          <TeacherOfferMissingFieldsAlert
            className="mt-3"
            missingFields={missingFields}
            onComplete={() => onAction("edit")}
          />
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {primary ? (
            <button
              type="button"
              disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60 sm:w-auto sm:min-w-[8rem]"
              onClick={() => onAction(primary)}
              data-testid={`teacher-offer-action-${primary}`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : labelFor(primary, offer.status, t)}
            </button>
          ) : null}
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            {secondary.map((action) => {
              const publishDisabled = action === "publish" && publishBlocked;
              return (
                <button
                  key={action}
                  type="button"
                  disabled={busy || publishDisabled}
                  aria-disabled={publishDisabled || undefined}
                  title={publishDisabled ? t("teacherOffersNotPublishable") : undefined}
                  className={cn(
                    "inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60 sm:w-auto sm:min-w-[7rem]",
                    action === "archive"
                      ? "border border-slate-200 text-slate-700 hover:bg-slate-50"
                      : action === "publish"
                        ? "border border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100"
                        : "border border-teal-200 text-teal-800 hover:bg-teal-50",
                  )}
                  onClick={() => {
                    if (publishDisabled) {
                      onAction("edit");
                      return;
                    }
                    onAction(action);
                  }}
                  data-testid={`teacher-offer-action-${action}`}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    labelFor(action, offer.status, t)
                  )}
                </button>
              );
            })}
          </div>
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
