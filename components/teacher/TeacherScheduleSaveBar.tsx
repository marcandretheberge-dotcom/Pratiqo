"use client";

import { Loader2, Save } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { scheduleSaveStatusKey, type ScheduleSaveStatus } from "@/lib/schedule/scheduleSaveState";
import { cn } from "@/lib/utils";

type Props = {
  status: ScheduleSaveStatus;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  className?: string;
  /** When true, show auto-save wording for saving. */
  autosaveActive?: boolean;
  testId?: string;
};

/**
 * Sticky bottom save bar for the teacher schedule page (PR 17C).
 */
export function TeacherScheduleSaveBar({
  status,
  dirty,
  saving,
  onSave,
  onDiscard,
  className,
  autosaveActive = false,
  testId = "teacher-schedule-save-bar",
}: Props) {
  const { t } = useLocale();

  const visible = dirty || saving || status === "error";
  if (!visible) return null;

  const statusLabel =
    status === "saving"
      ? autosaveActive
        ? t("scheduleSaveAutosaving")
        : t("scheduleSaveSaving")
      : status === "error"
        ? t("scheduleSaveError")
        : t("scheduleSaveUnsaved");

  return (
    <div
      className={cn(
        "sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur supports-[padding:max(0px)]:mb-[env(safe-area-inset-bottom)]",
        className,
      )}
      data-testid={testId}
      role="region"
      aria-label={t("scheduleSaveBarAria")}
      aria-live="polite"
    >
      <p className="text-xs font-medium text-slate-700" data-testid={`${testId}-status`}>
        {statusLabel}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onDiscard && dirty && !saving ? (
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            data-testid={`${testId}-discard`}
          >
            {t("scheduleSaveDiscard")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !dirty}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
          data-testid={`${testId}-save`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
          {saving ? t("scheduleSaveSaving") : t("scheduleSaveCta")}
        </button>
      </div>
    </div>
  );
}

export function TeacherScheduleSaveStatusBadge({ status }: { status: ScheduleSaveStatus }) {
  const { t } = useLocale();
  const key = scheduleSaveStatusKey(status);
  return (
    <p
      className={cn(
        "text-xs font-medium",
        status === "error" ? "text-red-700" : status === "unsaved" ? "text-amber-800" : "text-slate-600",
      )}
      data-testid="teacher-schedule-save-status"
      aria-live="polite"
    >
      {t(key)}
    </p>
  );
}
