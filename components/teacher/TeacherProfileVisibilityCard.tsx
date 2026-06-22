"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Eye, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import { teacherSetupSectionHref } from "@/lib/auth/teacherLoginRouting";
import {
  evaluateTeacherProfilePublishEligibility,
  teacherProfileVisibilityStatusBodyKey,
  teacherProfileVisibilityStatusLabelKey,
  type TeacherProfilePublishInput,
  type TeacherProfileVisibilityStatus,
} from "@/lib/teachers/profilePublishEligibility";
import type { TranslationKey } from "@/lib/translations";
import { cn } from "@/lib/utils";

export type TeacherProfileVisibilityCardProps = {
  teacher: TeacherProfilePublishInput;
  profileRole?: string | null;
  previewHref?: string;
  onVisibilityChange?: (isPublic: boolean) => void;
  className?: string;
};

export function TeacherProfileVisibilityCard({
  teacher,
  profileRole,
  previewHref = "/teacher/my-profile",
  onVisibilityChange,
  className,
}: TeacherProfileVisibilityCardProps) {
  const { t } = useLocale();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"ok" | "error">("ok");
  const [isPublic, setIsPublic] = useState(teacher.is_public === true);

  const evaluation = useMemo(
    () =>
      evaluateTeacherProfilePublishEligibility({
        ...teacher,
        is_public: isPublic,
      }),
    [teacher, isPublic],
  );

  const statusLabelKey = teacherProfileVisibilityStatusLabelKey(
    evaluation.status,
  ) as TranslationKey;
  const statusBodyKey = teacherProfileVisibilityStatusBodyKey(
    evaluation.status,
  ) as TranslationKey;

  const runVisibilityAction = useCallback(
    async (action: "publish" | "unpublish") => {
      setSaving(true);
      setMessage(null);
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setMessage(t("sessionExpiredShort"));
        setMessageKind("error");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/teacher/profile/visibility", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; is_public?: boolean };

      if (!res.ok) {
        setMessage(body.error || t("anErrorOccurred"));
        setMessageKind("error");
        setSaving(false);
        return;
      }

      const nextPublic = body.is_public === true;
      setIsPublic(nextPublic);
      onVisibilityChange?.(nextPublic);
      setMessage(
        nextPublic ? t("teacherProfilePublishSuccess") : t("teacherProfileUnpublishSuccess"),
      );
      setMessageKind("ok");
      setSaving(false);
    },
    [onVisibilityChange, t],
  );

  if (profileRole && profileRole !== "teacher") return null;

  const statusTone: Record<TeacherProfileVisibilityStatus, string> = {
    admin_hidden: "border-rose-200 bg-rose-50/80 text-rose-950",
    public: "border-teal-200 bg-teal-50/80 text-teal-950",
    incomplete: "border-amber-200 bg-amber-50/80 text-amber-950",
    ready_to_publish: "border-sky-200 bg-sky-50/80 text-sky-950",
    private_draft: "border-slate-200 bg-slate-50/80 text-slate-900",
  };

  return (
    <section
      className={cn(
        "rounded-2xl border p-5 shadow-sm",
        statusTone[evaluation.status],
        className,
      )}
      data-testid="teacher-profile-visibility-card"
      data-visibility-status={evaluation.status}
      aria-labelledby="teacher-profile-visibility-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p
            id="teacher-profile-visibility-title"
            className="text-xs font-bold uppercase tracking-widest opacity-80"
          >
            {t("teacherProfileVisibilityTitle")}
          </p>
          <h2 className="text-lg font-bold">{t(statusLabelKey)}</h2>
          <p className="text-sm leading-relaxed opacity-90">{t(statusBodyKey)}</p>
        </div>
        <Link
          href={previewHref}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-current/20 bg-white/70 px-4 py-2 text-sm font-semibold transition hover:bg-white"
          data-testid="teacher-profile-preview-link"
        >
          <Eye size={16} aria-hidden />
          {t("teacherProfilePreviewLink")}
        </Link>
      </div>

      {evaluation.status === "incomplete" || evaluation.status === "ready_to_publish" ? (
        <ul className="mt-4 space-y-2" data-testid="teacher-profile-publish-checklist">
          {evaluation.checklist.map((item) => (
            <li key={item.id}>
              <Link
                href={teacherSetupSectionHref(item.id)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition hover:bg-white/60"
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" aria-hidden />
                ) : (
                  <CircleDashed className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                )}
                <span className={item.done ? "text-slate-600 line-through" : "font-medium"}>
                  {t(item.labelKey)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void runVisibilityAction("publish")}
          disabled={saving || !evaluation.canPublish}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="teacher-profile-publish-button"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {t("teacherProfilePublishButton")}
        </button>
        <button
          type="button"
          onClick={() => void runVisibilityAction("unpublish")}
          disabled={saving || !evaluation.canUnpublish}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-current/25 bg-white/70 px-4 py-2.5 text-sm font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="teacher-profile-unpublish-button"
        >
          {t("teacherProfileUnpublishButton")}
        </button>
      </div>

      {message ? (
        <p
          className={cn(
            "mt-3 text-sm font-medium",
            messageKind === "ok" ? "text-teal-900" : "text-rose-800",
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
