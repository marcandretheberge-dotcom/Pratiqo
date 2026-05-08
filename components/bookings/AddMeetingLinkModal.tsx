"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import type { MeetingProvider } from "@/lib/meetingLinks";
import { detectMeetingProvider, isValidMeetingUrl, sanitizeMeetingUrl } from "@/lib/meetingLinks";

export function AddMeetingLinkModal({
  bookingId,
  isOpen,
  onClose,
  onSaved,
  initialUrl,
}: {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (data: { meeting_url: string; meeting_provider: MeetingProvider }) => void;
  initialUrl?: string;
}) {
  const { t } = useLocale();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setUrl(initialUrl ?? "");
    setError(null);
    setSaving(false);
  }, [isOpen, initialUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const cleaned = useMemo(() => sanitizeMeetingUrl(url), [url]);
  const provider = useMemo(() => detectMeetingProvider(cleaned || url), [cleaned, url]);

  const providerLabel = useMemo(() => {
    if (provider === "zoom") return t("meetingProviderZoom");
    if (provider === "google_meet") return t("meetingProviderGoogleMeet");
    if (provider === "microsoft_teams") return t("meetingProviderTeams");
    return t("meetingProviderOther");
  }, [provider, t]);

  if (!isOpen) return null;

  const submit = async () => {
    setError(null);
    if (!isValidMeetingUrl(url)) {
      setError(t("videoLinkInvalid"));
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error(t("bookingSessionExpired"));

      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/meeting-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ meeting_url: url }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        meeting_url?: string;
        meeting_provider?: MeetingProvider;
        error?: string;
      };
      if (!res.ok || !payload.success || !payload.meeting_url || !payload.meeting_provider) {
        throw new Error(payload.error || t("anErrorOccurred"));
      }
      onSaved({ meeting_url: payload.meeting_url, meeting_provider: payload.meeting_provider });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("anErrorOccurred"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t("videoLinkTitle")}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700">{t("addVideoLink")}</p>
            <h3 className="mt-1 flex items-center gap-2 text-lg font-extrabold text-slate-900">
              <Video size={18} className="text-teal-700" aria-hidden />
              {t("videoLinkTitle")}
            </h3>
            <p className="mt-2 text-sm text-slate-600">{t("videoLinkDescription")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("accessibilityCloseDialog")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-600">{t("videoProvider")}</span>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              {providerLabel}
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-600">URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("videoLinkPlaceholder")}
              className={cn(
                "h-12 w-full rounded-2xl border px-4 text-sm outline-none",
                error ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-teal-500",
              )}
              inputMode="url"
              autoComplete="off"
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving}
              className="h-11 rounded-2xl bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t("saving")}
                </span>
              ) : (
                t("saveAndShareVideoLink")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

