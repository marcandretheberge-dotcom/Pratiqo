"use client";

import React, { useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import { TeacherOfferCoverImage } from "@/components/teacher/TeacherOfferCoverImage";
import type { TeacherOfferDto } from "@/lib/offers/types";
import { cn } from "@/lib/utils";

type Props = {
  offerId: string | null;
  imageUrl: string | null;
  title: string;
  disabled?: boolean;
  onUploaded: (offer: TeacherOfferDto) => void;
  onRemoved: (offer: TeacherOfferDto) => void;
};

export function TeacherOfferCoverUpload({
  offerId,
  imageUrl,
  title,
  disabled = false,
  onUploaded,
  onRemoved,
}: Props) {
  const { t } = useLocale();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const displayUrl = localPreview || imageUrl;
  const alt = t("teacherOffersCoverAlt").replace("{title}", title.trim() || t("teacherOffersPreviewTitlePlaceholder"));

  const authHeaders = async (): Promise<HeadersInit | null> => {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const mapError = (code: string | undefined): string => {
    switch (code) {
      case "unsupported_image_type":
        return t("teacherOffersCoverUnsupported");
      case "image_too_large":
        return t("teacherOffersCoverTooLarge");
      case "invalid_file":
        return t("teacherOffersCoverInvalid");
      case "unauthenticated":
        return t("teacherOffersCoverUploadFailed");
      default:
        return t("teacherOffersCoverUploadFailed");
    }
  };

  const upload = async (file: File) => {
    if (!offerId || disabled) return;
    setBusy(true);
    setError(null);
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setError(t("teacherOffersCoverUploadFailed"));
        setLocalPreview(null);
        return;
      }
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/teacher/offers/${offerId}/cover`, {
        method: "POST",
        headers,
        body,
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        offer?: TeacherOfferDto;
      };
      if (!res.ok || !payload.offer) {
        setError(mapError(payload.error));
        setLocalPreview(null);
        return;
      }
      setLocalPreview(null);
      onUploaded(payload.offer);
    } catch {
      setError(t("teacherOffersCoverUploadFailed"));
      setLocalPreview(null);
    } finally {
      URL.revokeObjectURL(preview);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!offerId || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) {
        setError(t("teacherOffersCoverUploadFailed"));
        return;
      }
      const res = await fetch(`/api/teacher/offers/${offerId}/cover`, {
        method: "DELETE",
        headers,
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        offer?: TeacherOfferDto;
      };
      if (!res.ok || !payload.offer) {
        setError(mapError(payload.error));
        return;
      }
      setLocalPreview(null);
      onRemoved(payload.offer);
    } catch {
      setError(t("teacherOffersCoverUploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="teacher-offer-cover-upload">
      <div>
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-800">
          {t("teacherOffersCoverLabel")}
        </label>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{t("teacherOffersCoverHint")}</p>
        <p className="mt-1 text-xs text-slate-500">{t("teacherOffersCoverFormats")}</p>
        <p className="text-xs text-slate-500">{t("teacherOffersCoverMaxSize")}</p>
        <p className="mt-1 text-xs text-slate-500">{t("teacherOffersCoverTrustNote")}</p>
      </div>

      <TeacherOfferCoverImage imageUrl={displayUrl} title={title} alt={alt} />

      {!offerId ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {t("teacherOffersCoverSaveDraftFirst")}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled || busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <button
            type="button"
            disabled={disabled || busy}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-full bg-teal-700 px-4 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-60",
            )}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {imageUrl ? t("teacherOffersCoverReplace") : t("teacherOffersCoverAdd")}
          </button>
          {imageUrl ? (
            <button
              type="button"
              disabled={disabled || busy}
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              onClick={() => void remove()}
            >
              {t("teacherOffersCoverRemove")}
            </button>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="text-xs font-medium text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
