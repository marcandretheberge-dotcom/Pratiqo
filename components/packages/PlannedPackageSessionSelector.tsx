"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { getClientAccessToken } from "@/lib/auth/clientAccessToken";
import { getSupabaseClient } from "@/lib/supabase";
import { formatLocalISODate, formatSlotLabel, slotStartMinutes } from "@/lib/slots";
import type { PublicTeacherOfferDto } from "@/lib/offers/publicTeacherOfferDto";
import type { PlannedPackageSessionDraftDto } from "@/lib/offers/plannedPackageSessionDrafts";
import { isPlannedPackageOfferType } from "@/lib/offers/plannedPackages";
import { isPlannedPackageSessionDraftsUiEnabled } from "@/lib/offers/plannedPackageSessionDrafts";

type SelectedSession = {
  slotDate: string;
  timeSlot: string;
  startsAt: string;
};

function localSlotToIso(slotDate: string, timeSlot: string): string | null {
  const mins = slotStartMinutes(timeSlot);
  if (mins < 0) return null;
  const [y, m, d] = slotDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d, Math.floor(mins / 60), mins % 60, 0, 0);
  return date.toISOString();
}

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  date.setDate(date.getDate() + days);
  return formatLocalISODate(date);
}

type Props = {
  teacherId: string;
  offer: PublicTeacherOfferDto;
  open: boolean;
  onClose: () => void;
};

export function PlannedPackageSessionSelector({ teacherId, offer, open, onClose }: Props) {
  const { t, locale } = useLocale();
  const sessionCount = offer.sessionCount ?? 0;
  const durationMinutes = offer.durationMinutes ?? 60;
  const [selectedDate, setSelectedDate] = useState(() => formatLocalISODate(new Date()));
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selected, setSelected] = useState<SelectedSession[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlannedPackageSessionDraftDto | null>(null);

  const dayOptions = useMemo(() => {
    const today = formatLocalISODate(new Date());
    return Array.from({ length: 28 }, (_, i) => addDaysIso(today, i));
  }, []);

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/teachers/${encodeURIComponent(teacherId)}/slots?date=${encodeURIComponent(selectedDate)}&duration=${durationMinutes}`,
      );
      const json = (await res.json().catch(() => ({}))) as { slots?: string[] };
      setSlots(Array.isArray(json.slots) ? json.slots : []);
    } catch {
      setSlots([]);
      setError(t("plannedPackageDraftSlotUnavailable"));
    } finally {
      setLoadingSlots(false);
    }
  }, [teacherId, selectedDate, durationMinutes, t]);

  useEffect(() => {
    if (!open) return;
    void loadSlots();
  }, [open, loadSlots]);

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setDraft(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const progressLabel =
    selected.length === 1
      ? t("plannedPackageDraftProgressOne")
          .replace("{selected}", String(selected.length))
          .replace("{total}", String(sessionCount))
      : t("plannedPackageDraftProgressMany")
          .replace("{selected}", String(selected.length))
          .replace("{total}", String(sessionCount));

  const toggleSlot = (timeSlot: string) => {
    const startsAt = localSlotToIso(selectedDate, timeSlot);
    if (!startsAt) return;
    setError(null);
    setSelected((prev) => {
      const exists = prev.find((s) => s.startsAt === startsAt);
      if (exists) return prev.filter((s) => s.startsAt !== startsAt);
      if (prev.length >= sessionCount) return prev;
      return [...prev, { slotDate: selectedDate, timeSlot, startsAt }].sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt),
      );
    });
  };

  const createDraft = async () => {
    if (selected.length !== sessionCount) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getClientAccessToken(getSupabaseClient());
      if (!token) {
        setError(t("plannedPackageDraftCreateFailed"));
        return;
      }
      const res = await fetch("/api/planned-packages/session-drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacherOfferId: offer.id,
          sessions: selected.map((s) => ({ startsAt: s.startsAt })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        draft?: PlannedPackageSessionDraftDto;
        error?: string;
      };
      if (!res.ok || !json.draft) {
        if (json.error === "slot_outside_teacher_availability") {
          setError(t("plannedPackageDraftSlotUnavailable"));
        } else {
          setError(t("plannedPackageDraftCreateFailed"));
        }
        return;
      }
      setDraft(json.draft);
    } catch {
      setError(t("plannedPackageDraftCreateFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const priceLabel = new Intl.NumberFormat(locale === "en" ? "en-CA" : locale === "es" ? "es" : "fr-CA", {
    style: "currency",
    currency: offer.currency || "CAD",
  }).format((offer.priceCents ?? 0) / 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="planned-package-draft-title"
      data-testid="planned-package-session-selector"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("plannedPackageProposedByTeacher")}
            </p>
            <h2 id="planned-package-draft-title" className="mt-1 text-lg font-bold text-slate-900">
              {t("plannedPackageChooseSessions")}
            </h2>
            <p className="mt-1 text-sm text-slate-700">{offer.title}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{priceLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600"
          >
            ✕
          </button>
        </div>

        {draft ? (
          <div className="mt-4 space-y-3" data-testid="planned-package-draft-summary">
            <p className="text-sm font-semibold text-teal-800">{t("plannedPackageDraftCreated")}</p>
            <p className="text-sm text-slate-700">{t("plannedPackageSelectedSessions")}</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {draft.sessions.map((s) => (
                <li key={s.id}>
                  {new Date(s.startsAt).toLocaleString(
                    locale === "en" ? "en-CA" : locale === "es" ? "es" : "fr-CA",
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-amber-900">{t("plannedPackageNotReservedYet")}</p>
            <p className="text-xs leading-relaxed text-amber-900">{t("plannedPackageAvailabilityRecheck")}</p>
            <button
              type="button"
              disabled
              className="mt-2 inline-flex min-h-10 w-full cursor-not-allowed items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-500"
              data-testid="planned-package-payment-coming-soon"
            >
              {t("plannedPackagePaymentComingSoon")}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm font-medium text-slate-800" data-testid="planned-package-draft-progress">
              {progressLabel}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{t("plannedPackageNotReservedYet")}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{t("plannedPackageAvailabilityRecheck")}</p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("plannedPackagePrepareSessions")}
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              {loadingSlots ? (
                <p className="text-sm text-slate-500">…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-slate-500">{t("plannedPackageDraftSlotUnavailable")}</p>
              ) : (
                slots.map((slot) => {
                  const startsAt = localSlotToIso(selectedDate, slot);
                  const isSelected = selected.some((s) => s.startsAt === startsAt);
                  const mins = slotStartMinutes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleSlot(slot)}
                      className={
                        isSelected
                          ? "rounded-full border border-teal-300 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-900"
                          : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      }
                      data-testid={`planned-package-slot-${slot}`}
                    >
                      {formatSlotLabel(Math.floor(mins / 60), mins % 60)}
                    </button>
                  );
                })
              )}
            </div>

            {selected.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                {selected.map((s) => (
                  <li key={s.startsAt}>
                    {s.slotDate} · {s.timeSlot}
                  </li>
                ))}
              </ul>
            ) : null}

            {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

            <button
              type="button"
              disabled={submitting || selected.length !== sessionCount}
              onClick={() => void createDraft()}
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="planned-package-create-draft"
            >
              {t("plannedPackagePrepareSessions")}
            </button>
            <button
              type="button"
              disabled
              className="mt-2 inline-flex min-h-10 w-full cursor-not-allowed items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-500"
            >
              {t("plannedPackagePaymentComingSoon")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function shouldShowPlannedPackageSessionDraftCta(offer: PublicTeacherOfferDto): boolean {
  return (
    isPlannedPackageSessionDraftsUiEnabled() &&
    isPlannedPackageOfferType(offer.offerType) &&
    typeof offer.sessionCount === "number" &&
    offer.sessionCount >= 2
  );
}
