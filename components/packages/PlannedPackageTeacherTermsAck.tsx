"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { getClientAccessToken } from "@/lib/auth/clientAccessToken";
import { getSupabaseClient } from "@/lib/supabase";

type Props = {
  required: boolean;
};

/**
 * Teacher acknowledgment of planned package terms — required before publishing package offers.
 */
export function PlannedPackageTeacherTermsAck({ required }: Props) {
  const { t } = useLocale();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const token = await getClientAccessToken(getSupabaseClient());
      if (!token) return;
      const res = await fetch("/api/teacher/planned-packages/terms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { accepted?: boolean };
      if (res.ok && json.accepted) setAccepted(true);
    } catch {
      // ignore — publish API still enforces
    }
  }, []);

  useEffect(() => {
    if (required) void refresh();
  }, [required, refresh]);

  if (!required) return null;

  const onToggle = async (checked: boolean) => {
    setError(null);
    if (!checked) {
      setAccepted(false);
      return;
    }
    setLoading(true);
    try {
      const token = await getClientAccessToken(getSupabaseClient());
      if (!token) {
        setError(t("plannedPackageTeacherTermsRequired"));
        return;
      }
      const res = await fetch("/api/teacher/planned-packages/terms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accepted: true }),
      });
      if (!res.ok) {
        setError(t("plannedPackageTeacherTermsRequired"));
        setAccepted(false);
        return;
      }
      setAccepted(true);
    } catch {
      setError(t("plannedPackageTeacherTermsRequired"));
      setAccepted(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
      data-testid="planned-package-teacher-terms"
    >
      <p className="text-xs leading-relaxed text-slate-600">{t("plannedPackageTeacherTermsAck")}</p>
      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          className="mt-1"
          checked={accepted}
          disabled={loading}
          onChange={(e) => void onToggle(e.target.checked)}
          data-testid="planned-package-teacher-terms-checkbox"
        />
        <span>{t("plannedPackageTeacherTermsRequired")}</span>
      </label>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
