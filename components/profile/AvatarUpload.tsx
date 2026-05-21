"use client";

import React, { useId, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { getSupabaseClient } from "../../lib/supabase";
import { useLocale } from "../../lib/locale-context";
import { cn } from "../../lib/utils";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function safeAvatarFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^_+/, "").slice(0, 80);
  return cleaned || "avatar.webp";
}

type AvatarUploadProps = {
  userId: string;
  displayName: string;
  currentPhotoUrl: string | null;
  onPhotoUrlChange: (url: string | null) => void;
};

export function AvatarUpload({ userId, displayName, currentPhotoUrl, onPhotoUrlChange }: AvatarUploadProps) {
  const { t } = useLocale();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initials = getInitials(displayName) || "?";

  async function updateProfilePhoto(photoUrl: string | null) {
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase.from("profiles").update({ photo_url: photoUrl }).eq("id", userId);
    if (updateError) throw updateError;
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    setError(null);

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setError(t("avatarWrongType"));
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setError(t("avatarTooLarge"));
      return;
    }

    setBusy(true);
    try {
      const path = `${userId}/${Date.now()}-${safeAvatarFilename(file.name)}`;
      const supabase = getSupabaseClient();
      const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const publicUrl = data.publicUrl;
      if (!publicUrl) throw new Error("Avatar public URL was not returned");

      await updateProfilePhoto(publicUrl);
      onPhotoUrlChange(publicUrl);
    } catch (err) {
      console.error("[profile/avatar] upload failed", err);
      setError(t("avatarUploadError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      await updateProfilePhoto(null);
      onPhotoUrlChange(null);
    } catch (err) {
      console.error("[profile/avatar] remove failed", err);
      setError(t("avatarUploadError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[240px] flex-col items-center gap-2">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-teal-600 text-xl font-bold text-white shadow-[0_14px_40px_rgba(15,110,86,0.22)]">
          {currentPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentPhotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{initials}</span>
          )}
        </div>
        {busy ? (
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white text-teal-700 shadow-sm">
            <Loader2 size={16} className="animate-spin" aria-hidden />
          </span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={handleFileSelected}
        disabled={busy}
      />

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={t("avatarEdit")}
          className={cn(
            "inline-flex min-h-9 items-center gap-2 rounded-full border border-[#DCEAE3] bg-white px-3 py-2 text-xs font-bold text-[#0F6E56] shadow-sm transition hover:border-[#1D9E75]/40 hover:bg-[#F3FAF6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2",
            busy && "cursor-not-allowed opacity-70",
          )}
        >
          <Camera size={14} aria-hidden />
          {busy ? t("avatarUploading") : t("avatarEdit")}
        </button>

        {currentPhotoUrl ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            aria-label={t("avatarRemove")}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-full border border-rose-100 bg-white px-3 py-2 text-xs font-bold text-rose-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2",
              busy && "cursor-not-allowed opacity-70",
            )}
          >
            <Trash2 size={14} aria-hidden />
            {t("avatarRemove")}
          </button>
        ) : null}
      </div>

      <p className="text-center text-[11px] font-medium text-slate-500">{t("avatarHint")}</p>
      {error ? (
        <p className="text-center text-xs font-semibold text-rose-700" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
