"use client";

import React from "react";
import { Check, Circle } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { teacherOfferPublishChecklistLabel } from "@/lib/offers/display";
import {
  getTeacherOfferPublishChecklist,
  type TeacherOfferPublishChecklistItem,
} from "@/lib/offers/publishReadiness";
import type { TeacherOfferFormValues } from "@/lib/offers/clientPayload";
import { cn } from "@/lib/utils";

type Props = {
  values: TeacherOfferFormValues;
};

export function TeacherOfferPublishChecklist({ values }: Props) {
  const { t } = useLocale();
  const items = getTeacherOfferPublishChecklist(values);
  const ready = items.every((item) => item.ok);

  return (
    <section
      aria-labelledby="teacher-offer-publish-checklist-title"
      className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
    >
      <h3
        id="teacher-offer-publish-checklist-title"
        className="text-sm font-semibold text-slate-800"
      >
        {ready ? t("teacherOffersPublishReady") : t("teacherOffersPublishIncomplete")}
      </h3>
      <ul className="mt-2 space-y-1.5" aria-label={t("teacherOffersPublishChecklistAria")}>
        {items.map((item: TeacherOfferPublishChecklistItem) => (
          <li key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
            {item.ok ? (
              <Check className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
            )}
            <span className={cn(item.ok ? "text-slate-700" : "text-slate-500")}>
              {teacherOfferPublishChecklistLabel(item.id, t)}
              <span className="sr-only">
                {item.ok ? t("teacherOffersChecklistDone") : t("teacherOffersChecklistMissing")}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
