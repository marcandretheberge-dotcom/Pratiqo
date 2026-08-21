"use client";

import { useEffect, useId, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import {
  readScheduleIntervalMigrationModalDismissed,
  shouldShowScheduleIntervalMigrationModal,
  writeScheduleIntervalMigrationModalDismissed,
  type ScheduleIntervalMigrationState,
} from "@/lib/schedule/scheduleIntervalMigration";

type Props = {
  state: ScheduleIntervalMigrationState;
  onConfigure: () => void;
};

/**
 * First-visit modal on Horaire only. Never shown on dashboard login.
 * Dismissal is persisted in localStorage so it does not repeat.
 */
export function TeacherScheduleIntervalMigrationModal({ state, onConfigure }: Props) {
  const { t } = useLocale();
  const titleId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = readScheduleIntervalMigrationModalDismissed();
    setOpen(
      shouldShowScheduleIntervalMigrationModal({
        state,
        dismissed,
        onHorairePage: true,
      }),
    );
  }, [state.uiEnabled, state.preciseIntervalCount, state.legacyBlockCount]);

  const dismiss = () => {
    writeScheduleIntervalMigrationModalDismissed();
    setOpen(false);
  };

  const configure = () => {
    writeScheduleIntervalMigrationModalDismissed();
    setOpen(false);
    onConfigure();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      data-testid="teacher-schedule-interval-migration-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 id={titleId} className="text-lg font-bold text-[#2C2C2A]">
          {t("weeklyIntervalsMigrationModalTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("weeklyIntervalsMigrationModalBody")}</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">{t("weeklyIntervalsMigrationModalExample")}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            data-testid="teacher-schedule-interval-migration-modal-later"
          >
            {t("weeklyIntervalsMigrationModalLater")}
          </button>
          <button
            type="button"
            onClick={configure}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800"
            data-testid="teacher-schedule-interval-migration-modal-configure"
          >
            {t("weeklyIntervalsMigrationModalConfigure")}
          </button>
        </div>
      </div>
    </div>
  );
}
