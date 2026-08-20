"use client";

import React from "react";
import { useLocale } from "@/lib/locale-context";
import {
  formatAdminPricingSourceLabel,
  formatOfferSnapshotDisciplineLabel,
  formatOfferSnapshotDuration,
  formatOfferSnapshotPrice,
  formatOfferSnapshotSessionCount,
  type AdminOfferSnapshotDto,
  type AdminOfferSnapshotViewState,
  type AdminPricingSource,
} from "@/lib/offers/adminOfferSnapshotDisplay";
import {
  formatTeacherOfferFormatLabel,
  formatTeacherOfferTypeLabel,
  type TeacherOfferTranslator,
} from "@/lib/offers/display";
import { cn } from "@/lib/utils";

type Props = {
  snapshotState: AdminOfferSnapshotViewState;
  pricingSource: AdminPricingSource;
  className?: string;
};

export function AdminBookingOfferSnapshotSection({
  snapshotState,
  pricingSource,
  className,
}: Props) {
  const { t, locale } = useLocale();

  return (
    <section
      className={cn("rounded-lg border border-slate-200 bg-slate-50/60 p-3", className)}
      data-testid="admin-booking-offer-snapshot"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {t("adminOfferSnapshotSelectedHeading")}
      </h3>

      {snapshotState.kind === "incomplete" ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm font-medium text-amber-900">{t("adminOfferSnapshotIncomplete")}</p>
          {snapshotState.teacherOfferId ? (
            <p className="font-mono text-[11px] text-slate-600">{snapshotState.teacherOfferId}</p>
          ) : null}
        </div>
      ) : snapshotState.kind === "complete" ? (
        <OfferSnapshotDetails snapshot={snapshotState.snapshot} locale={locale} t={t} />
      ) : (
        <div className="mt-2 space-y-1 text-sm text-slate-600">
          <p>{t("adminOfferSnapshotNone")}</p>
          <p className="text-xs">{t("adminOfferSnapshotClassicRate")}</p>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        {formatAdminPricingSourceLabel(pricingSource, t)}
        {snapshotState.kind === "complete" ? (
          <>
            {" · "}
            {t("adminOfferSnapshotImmutableNote")}
          </>
        ) : null}
      </p>
    </section>
  );
}

function OfferSnapshotDetails({
  snapshot,
  locale,
  t,
}: {
  snapshot: AdminOfferSnapshotDto;
  locale: string;
  t: TeacherOfferTranslator;
}) {
  const duration = formatOfferSnapshotDuration(snapshot.durationMinutes, t);
  const sessions = formatOfferSnapshotSessionCount(snapshot.sessionCount, t);
  const discipline = formatOfferSnapshotDisciplineLabel(snapshot.disciplineId, locale);

  return (
    <dl className="mt-2 space-y-2 text-sm">
      <div>
        <dt className="text-xs text-slate-500">{t("adminOfferSnapshotTitle")}</dt>
        <dd className="font-medium text-slate-900">{snapshot.title}</dd>
      </div>
      <DetailRow
        label={t("adminOfferSnapshotType")}
        value={formatTeacherOfferTypeLabel(snapshot.type, t)}
      />
      <DetailRow
        label={t("adminOfferSnapshotFormat")}
        value={formatTeacherOfferFormatLabel(snapshot.format, t)}
      />
      <DetailRow
        label={t("adminOfferSnapshotPrice")}
        value={formatOfferSnapshotPrice(snapshot.priceCents, locale, snapshot.currency)}
      />
      {duration ? <DetailRow label={t("adminOfferSnapshotDuration")} value={duration} /> : null}
      {sessions ? <DetailRow label={t("adminOfferSnapshotSessions")} value={sessions} /> : null}
      {discipline ? <DetailRow label={t("adminOfferSnapshotDiscipline")} value={discipline} /> : null}
      {snapshot.specialite ? (
        <DetailRow label={t("adminOfferSnapshotSpecialite")} value={snapshot.specialite} />
      ) : null}
      {snapshot.snapshotVersion != null ? (
        <DetailRow
          label={t("adminOfferSnapshotVersion")}
          value={String(snapshot.snapshotVersion)}
        />
      ) : null}
      <div>
        <dt className="text-xs text-slate-500">{t("adminOfferSnapshotOfferId")}</dt>
        <dd className="font-mono text-[11px] text-slate-700">{snapshot.teacherOfferId}</dd>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">{t("adminOfferSnapshotSavedNote")}</p>
    </dl>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-900">{value}</dd>
    </div>
  );
}
